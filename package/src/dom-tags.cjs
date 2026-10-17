// The tag names that are DOM elements: HTML's and SVG's (as JSX spells them).
// The JSX pass stamps only these and custom elements (a name with a "-"). Other
// lowercase JSX isn't the DOM: React Three Fiber's <mesh> is a three.js object,
// which a data-spotnote prop breaks.
const HTML = `a abbr address area article aside audio b base bdi bdo blockquote body br button canvas
caption cite code col colgroup data datalist dd del details dfn dialog div dl dt em embed fieldset
figcaption figure footer form h1 h2 h3 h4 h5 h6 head header hgroup hr html i iframe img input ins kbd
label legend li link main map mark menu meta meter nav noscript object ol optgroup option output p
picture pre progress q rp rt ruby s samp search section select slot small source span strong style sub
summary sup table tbody td template textarea tfoot th thead time title tr track u ul var video wbr`;

const SVG = `svg animate animateMotion animateTransform circle clipPath defs desc ellipse feBlend
feColorMatrix feComponentTransfer feComposite feConvolveMatrix feDiffuseLighting feDisplacementMap
feDistantLight feDropShadow feFlood feFuncA feFuncB feFuncG feFuncR feGaussianBlur feImage feMerge
feMergeNode feMorphology feOffset fePointLight feSpecularLighting feSpotLight feTile feTurbulence filter
foreignObject g image line linearGradient marker mask metadata mpath path pattern polygon polyline
radialGradient rect set stop switch symbol text textPath tspan use view`;

module.exports = new Set(`${HTML} ${SVG}`.split(/\s+/));
