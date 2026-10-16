import Bar from "./Bar.jsx";

// A component reused across the products grid — its host elements stamp to
// ProductCard.jsx, and its many instances exercise the occurrence-index id.
export default function ProductCard() {
  return (
    <div className="product">
      <div className="muted">
        <Bar w={50} h={10} />
      </div>
      <h3>
        <Bar w="70%" h={16} dark />
      </h3>
      <div className="price">
        <Bar w={40} h={14} dark />
      </div>
    </div>
  );
}
