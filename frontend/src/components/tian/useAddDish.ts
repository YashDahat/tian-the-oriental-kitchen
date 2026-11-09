import { useCart } from '@/cart';
import type { DishDto } from '@/types/dining';

/** Adds a dish to the (foundation) cart with the composite DISH:<id> line id the order spine expects. */
export function useAddDish() {
  const { addItem } = useCart();
  return (dish: DishDto, qty = 1) =>
    addItem({
      id: `DISH:${dish.id}`,
      name: dish.name,
      unitPrice: Number(dish.price),
      imageUrl: dish.imageUrl,
      metadata: { itemType: 'DISH', itemId: dish.id, veg: dish.veg },
    }, qty);
}
