import htmltojsx from 'htmltojsx';
const c = new htmltojsx();

const frag = '<a href="/product-engineering/" class=" dropdown-item" aria-haspopup="true" aria-expanded="false">Product Engineering<i class="icon icon-down-arrow1 elementskit-submenu-indicator" aria-hidden="true"></i></a>';
console.log(JSON.stringify(c.convert(frag)));
