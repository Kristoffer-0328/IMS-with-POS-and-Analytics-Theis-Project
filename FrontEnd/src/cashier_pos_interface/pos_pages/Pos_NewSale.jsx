import React, { useState } from 'react';
import { FiPrinter } from 'react-icons/fi';

const products = [
  { id: 1, name: 'White Cement', price: 49.5, img: '/images/white-cement.jpeg' },
  { id: 2, name: 'Portland Cement', price: 126.0, img: '/images/portland-cement.png' },
  { id: 3, name: 'Masonry Cement', price: 115.2, img: '/images/masonry-cement.png' },
  { id: 4, name: 'Expansive Cement', price: 79.0, img: '/images/expansive-cement.png' },
  { id: 5, name: 'Quicklime', price: 76.0, img: '/images/quicklime.jpg' },
  { id: 6, name: 'Plaster of Paris', price: 238.0, img: '/images/plaster-of-paris.png' },
  { id: 7, name: 'Copper Pipes', price: 0, img: '/images/copper-pipes.jpg', hasVariants: true },
];

// Copper variants
const copperVariants = {
  'Type K': [ { label: '¾ in. hard copper', price: 14.77 }, { label: '1 in. soft coil', price: 8.5 } ],
  'Type L': [ { label: '½ in. straight', price: 3.66 }, { label: '¾ in. straight', price: 5.42 }, { label: '1 in. straight', price: 7.73 } ],
  'Type M': [ { label: '½ in. straight', price: 2.46 }, { label: '¾ in. straight', price: 3.99 }, { label: '½ in. coil (soft)', price: 2.71 } ],
  'Copper DWV': [ { label: '1½ in. straight', price: 5.99 } ],
  'Cupronickel': [ { label: '¼ in. x 25 ft coil', price: 4.34 } ],
};

export default function Pos_NewSale() {
  const [cart, setCart] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [qty, setQty] = useState(1);
  const [activeType, setActiveType] = useState(Object.keys(copperVariants)[0]);
  const [activeSize, setActiveSize] = useState(copperVariants[Object.keys(copperVariants)[0]][0]);

  const addToCart = (prod) => {
    setCart(c => {
      const exists = c.find(x => x.id === prod.id && x.variant === prod.variant);
      if (exists) return c.map(x => x.id === prod.id && x.variant === prod.variant ? { ...x, qty: x.qty + prod.qty } : x);
      return [...c, prod];
    });
  };

  const handleAddProduct = (p) => {
    if (p.hasVariants) {
      setQty(1);
      setActiveType(Object.keys(copperVariants)[0]);
      setActiveSize(copperVariants[Object.keys(copperVariants)[0]][0]);
      setModalOpen(true);
    } else {
      addToCart({ id: p.id, name: p.name, price: p.price, qty: 1, variant: '' });
    }
  };

  const handleAddVariant = () => {
    addToCart({
      id: 7,
      name: `Copper Pipes (${activeType} ${activeSize.label})`,
      price: activeSize.price,
      qty,
      variant: `${activeType}|${activeSize.label}`
    });
    setModalOpen(false);
  };

  const handlePrint = () => window.print();

  const subTotal = cart.reduce((sum, i) => sum + i.price * i.qty, 0);

  return (
    <div className="flex flex-col h-full">
      <header className="flex items-center justify-between bg-white px-6 py-4 border-b">
        <h1 className="text-2xl font-semibold">New Sale</h1>
        <div className="text-sm text-gray-600">12:45 PM | Tuesday, April 30, 2025</div>
        <div className="text-sm font-medium">Moni Roy <span className="text-gray-500">| Cashier</span></div>
      </header>
      <div className="flex flex-1 overflow-hidden">
        {/* Product Grid */}
        <div className="flex-1 p-6 overflow-auto">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {products.map(p => (
              <div key={p.id}
                className="bg-white rounded-2xl shadow p-4 flex flex-col hover:shadow-lg transition"
              >
                <img src={p.img} alt={p.name} className="h-32 object-contain mb-4" />
                <div className="flex-1">
                  <h3 className="font-medium">{p.name}</h3>
                  {!p.hasVariants && (
                    <p className="mt-1 text-lg font-semibold">₱{p.price.toFixed(2)}</p>
                  )}
                </div>
                <button
                  onClick={() => handleAddProduct(p)}
                  className="mt-4 w-full py-2 bg-[#ff7b54] text-white rounded-lg hover:bg-orange-600 transition"
                >Add Product</button>
              </div>
            ))}
          </div>
        </div>

        {/* Invoice Panel */}
        <aside className="invoice-panel w-80 bg-white border-l p-6 flex flex-col">
          <div className="mb-4">
            <p className="text-xs text-gray-500">Invoice From:</p>
            <p className="font-semibold">Virginia Walker</p>
            <p className="text-xs text-gray-500 mt-2">Invoice To:</p>
            <p className="font-semibold">Austin Miller</p>
            <p className="text-xs text-gray-500 mt-2">Date:</p>
            <p className="font-semibold">12 Nov 2019</p>
          </div>
          <div className="flex-1 overflow-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b">
                  <th className="py-2">#</th>
                  <th>Description</th>
                  <th>Qty</th>
                  <th>Unit</th>
                  <th>Total</th>
                </tr>
              </thead>
              <tbody>
                {cart.length === 0 ? (
                  <tr><td colSpan="5" className="py-6 text-center text-gray-400">No items in cart</td></tr>
                ) : (
                  cart.map((it, i) => (
                    <tr key={i} className="border-b">
                      <td className="py-2">{i+1}</td>
                      <td>{it.name}</td>
                      <td>{it.qty}</td>
                      <td>₱{it.price.toFixed(2)}</td>
                      <td>₱{(it.price*it.qty).toFixed(2)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          <div className="mt-4 border-t pt-4">
            <div className="flex justify-between">
              <span>Subtotal:</span><span>₱{subTotal.toFixed(2)}</span>
            </div>
          </div>
          <div className="mt-6 flex justify-between items-center">
            <button onClick={handlePrint} className="p-3 rounded-full border hover:bg-gray-100">
              <FiPrinter size={24} className="text-gray-600" />
            </button>
            <button className="px-6 py-3 bg-[#ff7b54] text-white rounded-lg hover:bg-orange-600">Send</button>
          </div>
        </aside>
      </div>

      {/* Copper Modal */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl p-6 w-11/12 max-w-md">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">Copper Pipes</h2>
              <button onClick={() => setModalOpen(false)} className="text-gray-600 text-2xl">&times;</button>
            </div>
            <img src="/images/copper-pipes.jpg" alt="Copper Pipes" className="h-40 w-full object-cover rounded-lg mb-4" />
            <div className="mb-4">
              <p className="font-medium mb-2">Type:</p>
              <div className="flex flex-wrap gap-2">
                {Object.keys(copperVariants).map(type => (
                  <button key={type}
                    onClick={() => { setActiveType(type); setActiveSize(copperVariants[type][0]); }}
                    className={`px-3 py-1 rounded-lg border ${activeType===type?'bg-[#ff7b54] text-white':'bg-gray-100 text-gray-700'}`}
                  >{type}</button>
                ))}
              </div>
            </div>
            <div className="mb-4">
              <p className="font-medium mb-2">Size:</p>
              <div className="flex flex-wrap gap-2">
                {copperVariants[activeType].map(opt => (
                  <button key={opt.label}
                    onClick={() => setActiveSize(opt)}
                    className={`px-3 py-1 rounded-lg border ${activeSize.label===opt.label?'bg-[#ff7b54] text-white':'bg-gray-100 text-gray-700'}`}
                  >{opt.label}</button>
                ))}
              </div>
            </div>
            <div className="mb-4 flex items-center justify-between">
              <p className="text-lg">Price: <span className="font-semibold">${activeSize.price.toFixed(2)}/ft</span></p>
              <div className="flex items-center border rounded-lg overflow-hidden">
                <button onClick={()=>qty>1&&setQty(qty-1)} className="px-3 py-1">-</button>
                <span className="px-4">{qty}</span>
                <button onClick={()=>setQty(qty+1)} className="px-3 py-1">+</button>
              </div>
            </div>
            <div className="flex justify-end">
              <button onClick={handleAddVariant} className="px-6 py-2 bg-[#ff7b54] text-white rounded-lg hover:bg-orange-600 transition">Add Product</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
