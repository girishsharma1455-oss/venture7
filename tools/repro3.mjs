import htmltojsx from 'htmltojsx';
const c = new htmltojsx();

const frag = '<li id="menu-item-14103" data-vertical-menu="750px"><a href="/product-engineering/" class=" dropdown-item" aria-haspopup="true">Product Engineering</a></li>';
console.log(JSON.stringify(c.convert(frag)));
