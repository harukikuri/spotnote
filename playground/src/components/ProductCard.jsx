export function ProductCard({ product }) {
  const [light, deep] = product.tint;
  return (
    <div className="card">
      <div className="photo" style={{ background: `radial-gradient(60% 60% at 50% 55%, ${deep}, ${light})` }} />
      <div className="row">
        <span className="name">{product.name}</span>
        <span className="price">{product.price}</span>
      </div>
      <button type="button" className="add">
        Add to cart
      </button>
    </div>
  );
}
