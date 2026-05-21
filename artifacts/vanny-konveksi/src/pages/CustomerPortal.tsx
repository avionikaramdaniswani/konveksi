import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth";
import { useCart } from "@/hooks/useCart";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Menu, ChevronRight, Bell, ShoppingCart } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

import { Order, Product, CartItem, Section, menuItems } from "./portal/types";
import PortalSidebar from "./portal/PortalSidebar";
import PortalBeranda from "./portal/PortalBeranda";
import PortalKatalog from "./portal/PortalKatalog";
import PortalPesanan from "./portal/PortalPesanan";
import PortalProfil from "./portal/PortalProfil";
import PortalCart from "./portal/PortalCart";
import PortalCheckout from "./portal/PortalCheckout";
import PortalCustomBuilder from "./portal/PortalCustomBuilder";
import ProductDetailDialog from "./portal/ProductDetailDialog";
import PortalChatbot from "./portal/PortalChatbot";

export default function CustomerPortal() {
  const { user, profile, logout } = useAuth();
  const { toast } = useToast();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [section, setSection] = useState<Section>("beranda");
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  // Catalog state
  const [products, setProducts] = useState<Product[]>([]);
  const [productsLoading, setProductsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterCategory, setFilterCategory] = useState("semua");
  const [activeProduct, setActiveProduct] = useState<Product | null>(null);
  const [activeImageIdx, setActiveImageIdx] = useState(0);

  // Cart — synced ke Supabase per akun, fallback localStorage
  const { cartItems, setCartItems } = useCart(user?.id);

  useEffect(() => {
    const fetchOrders = async () => {
      if (!profile) return;
      const [byId, byName] = await Promise.all([
        supabase.from("orders").select("*").eq("customer_id", profile.id).order("created_at", { ascending: false }),
        supabase.from("orders").select("*").ilike("customer_name", `%${profile.full_name}%`).order("created_at", { ascending: false }),
      ]);
      if (byId.error) console.error("fetchOrders byId:", byId.error);
      if (byName.error) console.error("fetchOrders byName:", byName.error);
      const merged = [...(byId.data ?? []), ...(byName.data ?? [])];
      const deduped = Array.from(new Map(merged.map((o) => [o.id, o])).values())
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      setOrders(deduped as Order[]);
      setLoading(false);
    };
    fetchOrders();
  }, [profile]);

  useEffect(() => {
    const fetchProducts = async () => {
      const { data } = await supabase
        .from("products")
        .select("*")
        .eq("status", "aktif")
        .order("name");
      if (data) setProducts(data as Product[]);
      setProductsLoading(false);
    };
    fetchProducts();
  }, []);

  const initials = profile?.full_name?.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase() ?? "U";

  const handleOpenProduct = (p: Product) => {
    setActiveProduct(p);
    setActiveImageIdx(0);
  };

  const handleAddToCart = (item: CartItem) => {
    setCartItems((prev) => {
      const existingIdx = prev.findIndex(
        (c) => c.product.id === item.product.id && c.selectedSize === item.selectedSize
      );
      if (existingIdx >= 0) {
        const updated = [...prev];
        updated[existingIdx] = {
          ...updated[existingIdx],
          qty: updated[existingIdx].qty + item.qty,
        };
        return updated;
      }
      return [...prev, item];
    });
    toast({
      title: "Ditambahkan ke keranjang",
      description: `${item.product.name}${item.selectedSize ? ` (${item.selectedSize})` : ""} × ${item.qty}`,
    });
  };

  const handleCartUpdate = (id: string, qty: number) => {
    setCartItems((prev) => prev.map((c) => c.id === id ? { ...c, qty } : c));
  };

  const handleCartRemove = (id: string) => {
    setCartItems((prev) => prev.filter((c) => c.id !== id));
  };

  const handleCheckoutSuccess = async () => {
    setCartItems([]);
    setSection("pesanan");
    const [byId, byName] = await Promise.all([
      supabase.from("orders").select("*").eq("customer_id", profile?.id ?? "").order("created_at", { ascending: false }),
      supabase.from("orders").select("*").ilike("customer_name", `%${profile?.full_name ?? ""}%`).order("created_at", { ascending: false }),
    ]);
    const merged = [...(byId.data ?? []), ...(byName.data ?? [])];
    const deduped = Array.from(new Map(merged.map((o) => [o.id, o])).values())
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    if (deduped.length > 0) setOrders(deduped as Order[]);
    toast({
      title: "Pesanan berhasil dibuat!",
      description: "Pesanan kamu sudah masuk. Tim kami akan segera memproses.",
    });
  };

  const cartCount = cartItems.reduce((sum, i) => sum + i.qty, 0);

  const sectionLabel = section === "checkout"
    ? "Checkout"
    : menuItems.find((m) => m.id === section)?.label ?? "";

  return (
    <div className="h-screen flex overflow-hidden font-sans bg-background">
      {/* Sidebar Desktop */}
      <aside
        className={`hidden lg:flex flex-col shrink-0 transition-all duration-300 ease-in-out h-screen sticky top-0 ${collapsed ? "w-[68px]" : "w-[240px]"}`}
        style={{ backgroundColor: "#134e4a" }}
      >
        <PortalSidebar
          collapsed={collapsed}
          setCollapsed={setCollapsed}
          section={section}
          setSection={setSection}
          setMobileOpen={setMobileOpen}
          initials={initials}
          fullName={profile?.full_name ?? "Pelanggan"}
          onLogout={logout}
        />
      </aside>

      {/* Sidebar Mobile Overlay */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setMobileOpen(false)}
              className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 lg:hidden"
            />
            <motion.aside
              initial={{ x: "-100%" }} animate={{ x: 0 }} exit={{ x: "-100%" }}
              transition={{ type: "spring", bounce: 0, duration: 0.35 }}
              className="fixed inset-y-0 left-0 w-[240px] z-50 flex flex-col lg:hidden shadow-2xl"
              style={{ backgroundColor: "#134e4a" }}
            >
              <PortalSidebar
                isMobile
                collapsed={collapsed}
                setCollapsed={setCollapsed}
                section={section}
                setSection={setSection}
                setMobileOpen={setMobileOpen}
                initials={initials}
                fullName={profile?.full_name ?? "Pelanggan"}
                onLogout={logout}
              />
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Topbar */}
        <header className="h-[60px] flex items-center justify-between px-4 lg:px-6 border-b border-black/[0.06] bg-white sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className="lg:hidden w-9 h-9 rounded-lg flex items-center justify-center hover:bg-gray-100 transition-colors text-gray-600"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="hidden lg:flex items-center gap-2 text-sm text-muted-foreground">
              <span>Vanny Konveksi</span>
              <ChevronRight className="w-3.5 h-3.5 opacity-40" />
              <span className="text-foreground font-medium">{sectionLabel}</span>
            </div>
            <h1 className="lg:hidden font-display font-bold text-lg text-foreground">{sectionLabel}</h1>
          </div>
          <div className="flex items-center gap-2">
            <button className="relative w-9 h-9 rounded-full hover:bg-gray-100 flex items-center justify-center transition-colors">
              <Bell className="w-5 h-5 text-gray-500" />
            </button>
            <button
              onClick={() => setSection("keranjang")}
              className="relative w-9 h-9 rounded-full hover:bg-gray-100 flex items-center justify-center transition-colors"
            >
              <ShoppingCart className="w-5 h-5 text-gray-500" />
              {cartCount > 0 && (
                <span className="absolute top-0.5 right-0.5 min-w-[16px] h-4 px-1 bg-orange-400 text-white text-[10px] font-bold rounded-full flex items-center justify-center leading-none">
                  {cartCount}
                </span>
              )}
            </button>
            <Avatar className="w-8 h-8 border border-teal-200">
              <AvatarFallback className="bg-teal-600 text-white text-xs font-semibold">{initials}</AvatarFallback>
            </Avatar>
          </div>
        </header>

        {/* Page Content */}
        <div className="flex-1 overflow-y-auto p-4 lg:p-6">
          <div className="max-w-5xl mx-auto w-full">
            <motion.div key={section} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}>
              {section === "beranda" && (
                <PortalBeranda
                  profile={profile}
                  orders={orders}
                  loading={loading}
                  setSection={setSection}
                />
              )}

              {section === "katalog" && (
                <PortalKatalog
                  products={products}
                  loading={productsLoading}
                  search={search}
                  setSearch={setSearch}
                  filterCategory={filterCategory}
                  setFilterCategory={setFilterCategory}
                  onOpenProduct={handleOpenProduct}
                />
              )}

              {section === "keranjang" && (
                <PortalCart
                  cartItems={cartItems}
                  onUpdate={handleCartUpdate}
                  onRemove={handleCartRemove}
                  setSection={setSection}
                />
              )}

              {section === "checkout" && (
                <PortalCheckout
                  cartItems={cartItems}
                  profile={profile}
                  onSuccess={handleCheckoutSuccess}
                  setSection={setSection}
                />
              )}

              {section === "custom" && (
                <PortalCustomBuilder onAddToCart={handleAddToCart} setSection={setSection} />
              )}

              {section === "pesanan" && (
                <PortalPesanan orders={orders} loading={loading} />
              )}

              {section === "profil" && (
                <PortalProfil profile={profile} orders={orders} initials={initials} />
              )}
            </motion.div>
          </div>
        </div>
      </div>

      <ProductDetailDialog
        product={activeProduct}
        imageIdx={activeImageIdx}
        setImageIdx={setActiveImageIdx}
        onClose={() => setActiveProduct(null)}
        onAddToCart={handleAddToCart}
      />

      <PortalChatbot />
    </div>
  );
}
