export function Header() {
  return (
    <header className="header">
      <b className="logo">acme</b>
      <nav className="nav">
        <a href="#new">New</a>
        <a href="#men">Men</a>
        <a href="#women">Women</a>
        <a href="#sale">Sale</a>
      </nav>
      <button type="button" className="cart">
        Cart (0)
      </button>
    </header>
  );
}
