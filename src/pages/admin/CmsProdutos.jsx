import React, { useState, useEffect } from 'react';
import { collection, getDocs, doc, setDoc, deleteDoc } from 'firebase/firestore';
import { 
  Plus, 
  Search, 
  Pencil, 
  Trash2, 
  X, 
  Package, 
  ShoppingBag, 
  Tag, 
  Check, 
  ExternalLink,
  Layers,
  AlertCircle
} from 'lucide-react';
import { db } from '../../services/firebaseConfig';
import { PRODUCTS_DATA } from '../../data/productsData';
import styles from './CmsProdutos.module.css';

export function CmsProdutos() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFilter, setSelectedFilter] = useState('all'); // 'all', 'camisa', 'jaqueta', 'calca', 'brinde'
  
  // Controle do Formulário / Drawer de Criação
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // Estado do Formulário
  const [formData, setFormData] = useState({
    name: '',
    type: 'vestuario', // 'vestuario' ou 'brinde'
    category: 'camisa',
    fit: 'boxy',
    drop: 'leak-two',
    price: '',
    originalPrice: '',
    customBadge: 'LANÇAMENTO',
    isRelease: true,
    isFeatured: false,
    image: '',
    description: '',
    // Grade de Estoque / SKUs
    stock: {
      PP: 10,
      P: 15,
      M: 20,
      G: 15,
      GG: 5
    }
  });

  // 1. Carrega produtos do Firestore (com fallback para PRODUCTS_DATA inicial)
  const fetchProducts = async () => {
    setLoading(true);
    try {
      const snap = await getDocs(collection(db, 'products'));
      if (!snap.empty) {
        const list = [];
        snap.forEach(d => list.push({ id: d.id, ...d.data() }));
        setProducts(list);
      } else {
        // Popula com dados mock se o Firestore ainda estiver vazio
        setProducts(PRODUCTS_DATA.map(p => ({
          ...p,
          customBadge: p.isRelease ? 'LANÇAMENTO' : '',
          isFeatured: true,
          stock: { PP: 5, P: 10, M: 15, G: 10, GG: 5 }
        })));
      }
    } catch (err) {
      console.warn("Aviso ao carregar produtos do Firestore:", err.message);
      setProducts(PRODUCTS_DATA.map(p => ({
        ...p,
        customBadge: p.isRelease ? 'LANÇAMENTO' : '',
        isFeatured: true,
        stock: { PP: 5, P: 10, M: 15, G: 10, GG: 5 }
      })));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  // Trava a rolagem do fundo (eixo Y) quando o drawer de produto estiver aberto
  useEffect(() => {
    if (isFormOpen) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [isFormOpen]);

  // Handlers do Formulário
  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleStockChange = (size, qty) => {
    setFormData(prev => ({
      ...prev,
      stock: {
        ...prev.stock,
        [size]: Math.max(0, parseInt(qty, 10) || 0)
      }
    }));
  };

  const handleOpenCreate = () => {
    setEditingId(null);
    setFormData({
      name: '',
      type: 'vestuario',
      category: 'camisa',
      fit: 'boxy',
      drop: 'leak-two',
      price: '',
      originalPrice: '',
      customBadge: 'LANÇAMENTO',
      isRelease: true,
      isFeatured: false,
      image: '',
      description: '',
      stock: { PP: 10, P: 15, M: 20, G: 15, GG: 5 }
    });
    setIsFormOpen(true);
  };

  const handleOpenEdit = (product) => {
    setEditingId(product.id);
    setFormData({
      name: product.name || product.title || '',
      type: product.type || (product.category === 'brinde' ? 'brinde' : 'vestuario'),
      category: product.category || 'camisa',
      fit: product.fit || 'boxy',
      drop: product.drop || 'leak-two',
      price: product.price || product.priceNum || '',
      originalPrice: product.originalPrice || '',
      customBadge: product.customBadge || '',
      isRelease: product.isRelease ?? false,
      isFeatured: product.isFeatured ?? false,
      image: product.image || '',
      description: product.description || '',
      stock: product.stock || { PP: 0, P: 0, M: 0, G: 0, GG: 0 }
    });
    setIsFormOpen(true);
  };

  const handleSubmitProduct = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) return;
    setSubmitting(true);

    const productId = editingId || `thr33_${Date.now()}`;
    const priceNum = parseFloat(formData.price) || 0;
    const origPriceNum = parseFloat(formData.originalPrice) || priceNum;

    // Cálculo automático de % de desconto
    const discountPercent = origPriceNum > priceNum 
      ? Math.round(((origPriceNum - priceNum) / origPriceNum) * 100)
      : 0;

    // Constrói objeto de variantes com SKU
    const catCode = (formData.category || 'XX').slice(0, 2).toUpperCase();
    const idSuffix = productId.slice(-4).toUpperCase();
    const variants = Object.entries(formData.stock).map(([size, quantity]) => ({
      sku: `THR33-${catCode}-${size}-${idSuffix}`,
      size,
      stock_quantity: Number(quantity)
    }));

    const productPayload = {
      id: productId,
      slug: productId,
      name: formData.name.trim(),
      title: formData.name.trim(),
      type: formData.type,
      category: formData.category,
      fit: formData.type === 'vestuario' ? formData.fit : 'único',
      drop: formData.drop,
      price: priceNum,
      priceNum: priceNum,
      originalPrice: origPriceNum,
      discount: discountPercent,
      customBadge: formData.customBadge.trim(),
      isRelease: formData.isRelease,
      isFeatured: formData.isFeatured,
      image: formData.image || "https://images.unsplash.com/photo-1521572267360-ee0c2909d518?q=80&w=600&auto=format&fit=crop",
      description: formData.description.trim(),
      stock: formData.stock,
      sizes: Object.keys(formData.stock).filter(size => (formData.stock[size] || 0) > 0),
      variants,
      updatedAt: new Date().toISOString()
    };

    try {
      await setDoc(doc(db, 'products', productId), productPayload, { merge: true });
      await fetchProducts();
      setIsFormOpen(false);
    } catch (err) {
      console.error("Erro ao salvar produto:", err);
      // Fallback local se Firestore falhar
      setProducts(prev => {
        const exists = prev.some(p => p.id === productId);
        if (exists) {
          return prev.map(p => p.id === productId ? { ...p, ...productPayload } : p);
        }
        return [productPayload, ...prev];
      });
      setIsFormOpen(false);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteProduct = async (productId) => {
    if (!window.confirm("Deseja realmente remover este produto do catálogo?")) return;
    try {
      await deleteDoc(doc(db, 'products', productId));
      setProducts(prev => prev.filter(p => p.id !== productId));
    } catch (err) {
      console.warn("Erro ao excluir do Firestore, atualizando localmente:", err.message);
      setProducts(prev => prev.filter(p => p.id !== productId));
    }
  };

  // Filtragem na Tabela
  const filteredList = products.filter(p => {
    const name = (p.name || p.title || '').toLowerCase();
    const matchesSearch = name.includes(searchTerm.toLowerCase());
    const matchesCat = selectedFilter === 'all' || p.category === selectedFilter || p.type === selectedFilter;
    return matchesSearch && matchesCat;
  });

  return (
    <div className={styles.catalogAdmin}>
      {/* HEADER DA PÁGINA */}
      <header className={styles.header}>
        <div>
          <span className={styles.breadcrumb}>CMS / CATÁLOGO & ESTOQUE</span>
          <h1 className={styles.title}>GESTÃO DE PRODUTOS & SKUS</h1>
        </div>
        <button onClick={handleOpenCreate} className={styles.createBtn}>
          <Plus size={16} />
          <span>ADICIONAR NOVO ITEM</span>
        </button>
      </header>

      {/* BARRA DE CONTROLE & BUSCA */}
      <div className={styles.controlBar}>
        <div className={styles.searchBox}>
          <Search size={15} className={styles.searchIcon} />
          <input 
            type="text" 
            placeholder="Buscar por nome da peça ou estampa..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          {searchTerm && (
            <button onClick={() => setSearchTerm('')} className={styles.clearSearchBtn} aria-label="Limpar busca">
              <X size={14} />
            </button>
          )}
        </div>

        <div className={styles.filtersRow}>
          {[
            { id: 'all', label: 'TODOS' },
            { id: 'camisa', label: 'CAMISETAS' },
            { id: 'jaqueta', label: 'JAQUETAS' },
            { id: 'calca', label: 'CALÇAS' },
            { id: 'brinde', label: 'BRINDES' }
          ].map(f => (
            <button
              key={f.id}
              className={`${styles.filterChip} ${selectedFilter === f.id ? styles.activeChip : ''}`}
              onClick={() => setSelectedFilter(f.id)}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* TABELA DE PRODUTOS */}
      <div className={styles.tableCard}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>IMAGEM</th>
              <th>NOME DO PRODUTO</th>
              <th>CATEGORIA / FIT</th>
              <th>PREÇO & DESCONTO</th>
              <th>BADGE</th>
              <th>ESTOQUE TOTAL</th>
              <th>AÇÕES</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="7" className={styles.centerText}>
                  <div className={styles.loadingWrapper}>
                    <Package size={20} className={styles.spinningIcon} />
                    <span>Carregando catálogo do Firestore...</span>
                  </div>
                </td>
              </tr>
            ) : filteredList.length === 0 ? (
              <tr>
                <td colSpan="7" className={styles.centerText}>
                  <div className={styles.emptyWrapper}>
                    <AlertCircle size={20} />
                    <span>Nenhum produto cadastrado com esses filtros.</span>
                  </div>
                </td>
              </tr>
            ) : (
              filteredList.map((prod) => {
                const totalUnits = prod.stock 
                  ? Object.values(prod.stock).reduce((a, b) => a + (Number(b) || 0), 0)
                  : 50;

                const priceValue = parseFloat(prod.price || prod.priceNum || 0);
                const originalPriceValue = parseFloat(prod.originalPrice || 0);
                const hasDiscount = originalPriceValue > priceValue;

                return (
                  <tr key={prod.id} className={styles.tableRow}>
                    <td>
                      <div className={styles.thumbWrapper}>
                        <img src={prod.image} alt={prod.name || prod.title} className={styles.thumbImage} />
                      </div>
                    </td>
                    <td>
                      <strong className={styles.productName}>{prod.name || prod.title}</strong>
                      <span className={styles.productDrop}>
                        {prod.drop === 'leak-two' ? 'LEAK TWO' : (prod.drop?.toUpperCase() || 'DROP REGULAR')}
                      </span>
                    </td>
                    <td>
                      <span className={styles.categoryBadge}>{(prod.category || 'GERAL').toUpperCase()}</span>
                      <small className={styles.fitText}>{(prod.fit || 'PADRÃO').toUpperCase()} FIT</small>
                    </td>
                    <td>
                      <div className={styles.priceColumn}>
                        <strong>R$ {priceValue.toFixed(2)}</strong>
                        {hasDiscount && (
                          <span className={styles.discountTag}>
                            -{prod.discount || Math.round(((originalPriceValue - priceValue) / originalPriceValue) * 100)}% OFF
                          </span>
                        )}
                      </div>
                    </td>
                    <td>
                      {prod.customBadge ? (
                        <span className={styles.customBadge}>{prod.customBadge}</span>
                      ) : prod.isRelease ? (
                        <span className={styles.customBadge}>LANÇAMENTO</span>
                      ) : (
                        <span className={styles.noBadge}>Padrão</span>
                      )}
                    </td>
                    <td>
                      <span className={`${styles.stockBadge} ${totalUnits === 0 ? styles.outOfStock : ''}`}>
                        {totalUnits > 0 ? `${totalUnits} un.` : 'ESGOTADO'}
                      </span>
                    </td>
                    <td>
                      <div className={styles.actionsGroup}>
                        <button 
                          onClick={() => handleOpenEdit(prod)} 
                          className={styles.editBtn}
                          title="Editar Produto"
                        >
                          <Pencil size={13} />
                          <span>Editar</span>
                        </button>
                        <button 
                          onClick={() => handleDeleteProduct(prod.id)} 
                          className={styles.deleteBtn}
                          title="Excluir Produto"
                        >
                          <Trash2 size={13} />
                          <span>Excluir</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* DRAWER / MODAL LATERAL DE CRIAÇÃO & EDIÇÃO */}
      {isFormOpen && (
        <div className={styles.modalBackdrop} onClick={() => setIsFormOpen(false)}>
          <div className={styles.drawer} onClick={(e) => e.stopPropagation()}>
            <div className={styles.drawerHeader}>
              <div className={styles.drawerTitleBox}>
                <ShoppingBag size={18} className={styles.drawerIcon} />
                <h2>{editingId ? 'EDITAR PRODUTO' : 'CRIAR NOVO PRODUTO'}</h2>
              </div>
              <button onClick={() => setIsFormOpen(false)} className={styles.closeDrawerBtn} aria-label="Fechar formulário">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmitProduct} className={styles.drawerForm}>
              {/* TIPO DE ITEM */}
              <div className={styles.formGroup}>
                <label>TIPO DE PRODUTO</label>
                <div className={styles.typeSwitcher}>
                  <button
                    type="button"
                    className={`${styles.switchBtn} ${formData.type === 'vestuario' ? styles.activeSwitch : ''}`}
                    onClick={() => setFormData({ ...formData, type: 'vestuario', category: 'camisa' })}
                  >
                    VESTUÁRIO (ROUPAS)
                  </button>
                  <button
                    type="button"
                    className={`${styles.switchBtn} ${formData.type === 'brinde' ? styles.activeSwitch : ''}`}
                    onClick={() => setFormData({ ...formData, type: 'brinde', category: 'brinde', fit: 'único' })}
                  >
                    BRINDES & VALES
                  </button>
                </div>
              </div>

              {/* NOME & IMAGEM */}
              <div className={styles.formGroup}>
                <label>NOME DA PEÇA *</label>
                <input 
                  type="text" 
                  name="name"
                  placeholder="Ex: Camiseta THR33 Boxy Heavy Black"
                  value={formData.name}
                  onChange={handleInputChange}
                  required
                />
              </div>

              <div className={styles.formGroup}>
                <label>URL DA IMAGEM PRINCIPAL *</label>
                <input 
                  type="url" 
                  name="image"
                  placeholder="https://images.unsplash.com/photo-..."
                  value={formData.image}
                  onChange={handleInputChange}
                  required
                />
                {formData.image && (
                  <div className={styles.previewImage}>
                    <img src={formData.image} alt="Preview" />
                  </div>
                )}
              </div>

              {/* CATEGORIA, FIT E DROP */}
              <div className={styles.gridTwo}>
                <div className={styles.formGroup}>
                  <label>CATEGORIA</label>
                  <select name="category" value={formData.category} onChange={handleInputChange}>
                    <option value="camisa">Camiseta / Camisa</option>
                    <option value="jaqueta">Jaqueta / Moletom</option>
                    <option value="calca">Calça / Bermuda</option>
                    <option value="brinde">Brinde / Acessório</option>
                    <option value="gift-card">Vale-Presente</option>
                  </select>
                </div>

                {formData.type === 'vestuario' && (
                  <div className={styles.formGroup}>
                    <label>MODELAGEM (FIT)</label>
                    <select name="fit" value={formData.fit} onChange={handleInputChange}>
                      <option value="boxy">Boxy Fit</option>
                      <option value="oversized">Oversized Fit</option>
                      <option value="normal">Normal Fit</option>
                      <option value="regata">Regata Athletic</option>
                    </select>
                  </div>
                )}
              </div>

              {/* PREÇOS & DESCONTOS */}
              <div className={styles.gridTwo}>
                <div className={styles.formGroup}>
                  <label>PREÇO FINAL (R$) *</label>
                  <input 
                    type="number" 
                    step="0.01"
                    name="price"
                    placeholder="189.90"
                    value={formData.price}
                    onChange={handleInputChange}
                    required
                  />
                </div>
                <div className={styles.formGroup}>
                  <label>PREÇO ORIGINAL (R$ - P/ DESCONTO)</label>
                  <input 
                    type="number" 
                    step="0.01"
                    name="originalPrice"
                    placeholder="229.90"
                    value={formData.originalPrice}
                    onChange={handleInputChange}
                  />
                </div>
              </div>

              {/* BADGE CUSTOMIZADO */}
              <div className={styles.formGroup}>
                <label>BADGE PERSONALIZADO (TAG NA VITRINE)</label>
                <input 
                  type="text" 
                  name="customBadge"
                  placeholder="Ex: LANÇAMENTO, -20% OFF, FOR THE FEW"
                  value={formData.customBadge}
                  onChange={handleInputChange}
                />
              </div>

              {/* GRADE DE ESTOQUE POR TAMANHO (SKUS) */}
              <div className={styles.stockSection}>
                <div className={styles.stockHeader}>
                  <Package size={14} className={styles.stockIcon} />
                  <label>ESTOQUE POR TAMANHO (GRADE DE SKUs)</label>
                </div>
                <div className={styles.stockGrid}>
                  {['PP', 'P', 'M', 'G', 'GG'].map(size => (
                    <div key={size} className={styles.stockBox}>
                      <span>{size}</span>
                      <input 
                        type="number"
                        min="0"
                        value={formData.stock[size] ?? 0}
                        onChange={(e) => handleStockChange(size, e.target.value)}
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* FLAGS DE DESTAQUE */}
              <div className={styles.checkboxGroup}>
                <label className={styles.checkboxLabel}>
                  <input 
                    type="checkbox" 
                    name="isRelease" 
                    checked={formData.isRelease}
                    onChange={handleInputChange}
                  />
                  <span>Destacar como Lançamento</span>
                </label>
                <label className={styles.checkboxLabel}>
                  <input 
                    type="checkbox" 
                    name="isFeatured" 
                    checked={formData.isFeatured}
                    onChange={handleInputChange}
                  />
                  <span>Priorizar no Topo do Catálogo</span>
                </label>
              </div>

              <button type="submit" disabled={submitting} className={styles.submitProductBtn}>
                <Check size={16} />
                <span>{submitting ? 'GRAVANDO NO FIRESTORE...' : (editingId ? 'SALVAR ALTERAÇÕES' : 'CRIAR PRODUTO')}</span>
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default CmsProdutos;
