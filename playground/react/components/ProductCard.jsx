// A component reused across the products grid — its host elements stamp to
// ProductCard.jsx, and its many instances exercise the occurrence-index id.
export default function ProductCard({ product }) {
  return (
    <div className="product">
      <div className="muted">{product.category}</div>
      <h3>{product.name}</h3>
      <div className="price">${product.price}</div>
    </div>
  );
}
