import htmltojsx from 'htmltojsx';
const c = new htmltojsx();
const test = '<a href="/product-engineering/" class="dropdown-item">x</a>';
console.log(JSON.stringify(c.convert(test)));
console.log(JSON.stringify(c.convert('<a href="/products/">x</a>')));
