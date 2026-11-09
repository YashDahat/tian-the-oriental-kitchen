import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Clock, MapPin, Smartphone, Store } from 'lucide-react';
import { useCart } from '@/cart';
import type { CartItem } from '@/cart';
import { useBranch } from '@/context/BranchContext';
import { orderService } from '@/services/orderService';
import { verifyPayment } from '@/services/paymentService';
import { loyaltyService } from '@/services/loyaltyService';
import { loadRazorpay, openRazorpay } from '@/lib/razorpay';
import type { CartLineInput, PlaceOrderRequest, QuoteResponse } from '@/types/order';
import type { OfferValidationResult } from '@/types/loyalty';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Switch } from '@/components/ui/switch';
import { BrushHeading } from '@/components/tian/BrushHeading';
import { VegMark } from '@/components/tian/VegMark';
import { TIAN, formatINR, openNow, usePageMeta } from '@/lib/tian';

function toLine(item: CartItem): CartLineInput {
  const md = (item.metadata ?? {}) as { itemType?: string; itemId?: number };
  const [t, id] = String(item.id).split(':');
  return { itemType: md.itemType ?? t, itemId: md.itemId ?? Number(id), variantKey: item.variantKey ?? null, quantity: item.quantity };
}

const COIN_CONNECTOR = 'loyalty.coins';
const DISCOUNT_CONNECTOR = 'loyalty.discount';

/**
 * TIAN checkout — pick-up only (the restaurant runs a takeaway counter, not delivery). Pay now by UPI/card via
 * the foundation Razorpay flow, or pay at the counter. Loyalty coins + discount codes ride the foundation
 * quote connectors. Sends only the cart; identity and prices are server-side.
 */
export default function CheckoutPage() {
  usePageMeta('Checkout | TIAN pick-up');
  const { cartItems, totals, clearCart } = useCart();
  const { selectedBranchId } = useBranch();
  const navigate = useNavigate();
  const [payMode, setPayMode] = useState<'ONLINE' | 'PAY_AT_COUNTER'>('ONLINE');
  const [useCoins, setUseCoins] = useState(false);
  const [codeInput, setCodeInput] = useState('');
  const [codeResult, setCodeResult] = useState<OfferValidationResult | null>(null);
  const [applying, setApplying] = useState(false);
  const [quote, setQuote] = useState<QuoteResponse | null>(null);
  const [placing, setPlacing] = useState(false);
  const lines = useMemo(() => cartItems.map(toLine), [cartItems]);
  const status = openNow();

  useEffect(() => {
    if (!lines.length) { setQuote(null); return; }
    let live = true;
    orderService.quote({ items: lines, fulfillmentType: 'SELF_PICKUP' }).then((q) => { if (live) setQuote(q); });
    return () => { live = false; };
  }, [lines]);
  useEffect(() => { setCodeResult(null); }, [totals.total]);

  const coinOption = quote?.options.find((o) => o.connectorId === COIN_CONNECTOR) ?? null;
  const coinDiscount = useCoins && coinOption ? coinOption.amount : 0;
  const codeDiscount = codeResult?.valid ? -codeResult.amount : 0;
  const grandTotal = totals.total + coinDiscount + codeDiscount;

  const applyCode = async () => {
    const code = codeInput.trim().toUpperCase();
    if (!code) return;
    setApplying(true);
    try { setCodeResult(await loyaltyService.validateOffer(code, totals.total)); } finally { setApplying(false); }
  };

  const place = async () => {
    const connectorSelections: Record<string, string> = {};
    if (useCoins && coinOption) connectorSelections[coinOption.connectorId] = coinOption.code;
    if (codeResult?.valid && codeResult.code) connectorSelections[DISCOUNT_CONNECTOR] = codeResult.code;
    const req: PlaceOrderRequest = {
      items: lines, fulfillmentType: 'SELF_PICKUP', paymentMode: payMode, connectorSelections,
      branchId: selectedBranchId ?? undefined,
    };
    setPlacing(true);
    try {
      const order = await orderService.place(req);
      if (!order.payment) {
        clearCart();
        toast.success('Order placed — pay at the counter when you collect');
        navigate(`/orders/${order.id}`);
        return;
      }
      if (order.payment.gatewayKeyId === 'demo_key') {
        await verifyPayment({ gatewayOrderId: order.payment.gatewayOrderId, gatewayPaymentId: `demo_pay_${order.payment.gatewayOrderId}`, signature: 'demo_signature' });
        clearCart();
        toast.success('Payment successful (demo mode)');
        navigate(`/orders/${order.id}`);
        return;
      }
      if (!(await loadRazorpay())) {
        toast.error('Could not load the payment window — you can pay from your order');
        navigate(`/orders/${order.id}`);
        return;
      }
      try {
        const result = await openRazorpay({
          keyId: order.payment.gatewayKeyId, orderId: order.payment.gatewayOrderId, amount: order.payment.amount,
          currency: order.payment.currency, name: 'TIAN — The Oriental Kitchen', description: order.orderNumber,
        });
        await verifyPayment({ gatewayOrderId: result.razorpay_order_id, gatewayPaymentId: result.razorpay_payment_id, signature: result.razorpay_signature });
        clearCart();
        toast.success('Paid — we\'re on it');
      } catch {
        toast.message('Payment not completed — you can pay from your order');
      }
      navigate(`/orders/${order.id}`);
    } finally {
      setPlacing(false);
    }
  };

  if (cartItems.length === 0) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center">
        <p className="text-lg">Your pick-up order is empty.</p>
        <Button asChild className="tap mt-4 rounded-full"><Link to="/menu">Browse the menu</Link></Button>
      </div>
    );
  }

  return (
    <div className="washi">
      <div className="mx-auto grid max-w-5xl gap-8 px-4 py-12 md:grid-cols-12">
        <div className="space-y-8 md:col-span-7">
          <BrushHeading as="h1" size="lg" eyebrow="Checkout">Pick-up order</BrushHeading>

          <section className="rounded-lg border bg-card p-5" aria-labelledby="pickup-h">
            <h2 id="pickup-h" className="flex items-center gap-2 font-semibold"><Store className="h-5 w-5" aria-hidden />Collect from TIAN</h2>
            <p className="mt-2 flex gap-2 text-sm text-muted-foreground"><MapPin className="h-4 w-4 shrink-0" aria-hidden />{TIAN.address}</p>
            <p className="mt-1 flex gap-2 text-sm text-muted-foreground"><Clock className="h-4 w-4 shrink-0" aria-hidden />
              {status.open ? 'Usually ready in 25–35 minutes. We\'ll email you when it\'s at the counter.' : `${status.label} — we'll start cooking when the kitchen opens.`}</p>
          </section>

          <section className="rounded-lg border bg-card p-5" aria-labelledby="pay-h">
            <h2 id="pay-h" className="font-semibold">Payment</h2>
            <RadioGroup value={payMode} onValueChange={(v) => setPayMode(v as 'ONLINE' | 'PAY_AT_COUNTER')} className="mt-3 space-y-2">
              <div className="flex items-center gap-3 rounded-md border p-3">
                <RadioGroupItem value="ONLINE" id="pay-online" />
                <Label htmlFor="pay-online" className="flex flex-1 items-center gap-2"><Smartphone className="h-4 w-4" aria-hidden />Pay now — UPI, cards, netbanking</Label>
              </div>
              <div className="flex items-center gap-3 rounded-md border p-3">
                <RadioGroupItem value="PAY_AT_COUNTER" id="pay-counter" />
                <Label htmlFor="pay-counter" className="flex-1">Pay at the counter when I collect</Label>
              </div>
            </RadioGroup>
            {coinOption && (
              <div className="mt-4 flex items-center justify-between gap-3">
                <Label htmlFor="use-coins">{coinOption.label}{coinOption.detail ? ` · ${coinOption.detail}` : ''}</Label>
                <Switch id="use-coins" checked={useCoins} onCheckedChange={setUseCoins} />
              </div>
            )}
            <div className="mt-4">
              <Label htmlFor="offer-code">Have a code?</Label>
              <div className="mt-1 flex gap-2">
                <Input id="offer-code" value={codeInput} onChange={(e) => setCodeInput(e.target.value)} placeholder="Code" className="h-11 uppercase" />
                <Button type="button" variant="outline" className="tap" onClick={applyCode} disabled={applying || !codeInput.trim()}>Apply</Button>
              </div>
              {codeResult && <p role="status" className={`mt-2 text-sm ${codeResult.valid ? 'text-green-700 dark:text-green-400' : 'text-destructive'}`}>{codeResult.message}</p>}
            </div>
          </section>
        </div>

        <aside className="md:col-span-5">
          <div className="sticky top-6 rounded-lg border bg-card p-5">
            <h2 className="font-semibold">Your order</h2>
            <ul className="mt-3 divide-y text-sm">
              {cartItems.map((i) => (
                <li key={`${i.id}-${i.variantKey ?? ''}`} className="flex items-start justify-between gap-3 py-2">
                  <span className="flex gap-2">{typeof i.metadata?.veg === 'boolean' && <span className="mt-1"><VegMark veg={i.metadata.veg as boolean} /></span>}{i.quantity} × {i.name}</span>
                  <span>{formatINR(i.unitPrice * i.quantity)}</span>
                </li>
              ))}
            </ul>
            <dl className="mt-3 space-y-1 border-t pt-3 text-sm">
              <div className="flex justify-between"><dt>Subtotal</dt><dd>{formatINR(totals.subtotal)}</dd></div>
              {coinDiscount !== 0 && <div className="flex justify-between"><dt>Coins</dt><dd>−{formatINR(Math.abs(coinDiscount))}</dd></div>}
              {codeDiscount !== 0 && <div className="flex justify-between"><dt>Code {codeResult?.code}</dt><dd>−{formatINR(Math.abs(codeDiscount))}</dd></div>}
              <div className="flex justify-between pt-2 text-base font-semibold"><dt>Total</dt><dd>{formatINR(Math.max(0, grandTotal))}</dd></div>
            </dl>
            <p className="mt-2 text-xs text-muted-foreground">No packing or convenience fees. Taxes as applicable.</p>
            <Button className="tap mt-5 w-full rounded-full" size="lg" onClick={place} disabled={placing}>
              {placing ? 'Placing…' : payMode === 'ONLINE' ? `Pay ${formatINR(Math.max(0, grandTotal))}` : 'Place pick-up order'}
            </Button>
          </div>
        </aside>
      </div>
    </div>
  );
}
