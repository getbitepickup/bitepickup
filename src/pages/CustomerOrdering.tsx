import React, { useState, useEffect, useRef } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import {
  ShoppingBag,
  Trash2,
  ArrowLeft,
  Plus,
  Minus,
  Clock,
  CreditCard,
  ChevronRight,
  CheckCircle,
  MapPin,
  Phone,
  Info,
  Check,
  Utensils,
  Store,
  X,
  ChevronUp,
  Loader2,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import {
  getRestaurants,
  getCategories,
  getMenuItems,
  addOrder,
  subscribeToStore,
  getCurrentRestaurantId,
  setCurrentRestaurantId,
} from "../store/apiStore";
import { Restaurant, Category, MenuItem, CartItem, Order } from "../types";
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements,
  CardElement,
  PaymentRequestButtonElement,
} from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";

// Load Stripe with publishable key
const stripePromise = loadStripe(
  import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY ||
    "pk_test_51TtmeRCut5206diIEYVMUx93Qc5b2v1LLSJRUe2rfWEzcqnm1LzPg7l189eAkr3hgKVnYbxcqBRGbOmttygrK0gG00XSNo3T6C",
);

// ============================================
// STRIPE PAYMENT FORM COMPONENT
// ============================================
const StripePaymentForm = ({
  clientSecret,
  orderId,
  orderReference,
  onSuccess,
  onError,
  onCancel,
  amount,
}: {
  clientSecret: string;
  orderId: string;
  orderReference: string;
  onSuccess: () => void;
  onError: (error: string) => void;
  onCancel: () => void;
  amount: number;
}) => {
  const stripe = useStripe();
  const elements = useElements();
  const [isLoading, setIsLoading] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [paymentSuccess, setPaymentSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      setPaymentError("Stripe is not initialized. Please try again.");
      return;
    }

    setIsLoading(true);
    setPaymentError(null);

    try {
      // Confirm the payment
      const { error, paymentIntent } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url:
            window.location.origin +
            `/restaurant/${window.location.pathname.split("/")[2] || ""}`,
          receipt_email:
            document.querySelector<HTMLInputElement>("#customer-email-input")
              ?.value || undefined,
        },
        redirect: "if_required",
      });

      if (error) {
        console.error("Payment error:", error);
        setPaymentError(error.message || "Payment failed. Please try again.");
        onError(error.message || "Payment failed");
        setIsLoading(false);
        return;
      }

      if (paymentIntent && paymentIntent.status === "succeeded") {
        setPaymentSuccess(true);
        onSuccess();
        setIsLoading(false);
      } else if (paymentIntent && paymentIntent.status === "requires_action") {
        // Payment requires 3D Secure or other action
        // The confirmPayment will handle this automatically with return_url
        console.log("Payment requires action:", paymentIntent);
        setIsLoading(false);
      } else {
        setPaymentError("Payment was not completed. Please try again.");
        onError("Payment was not completed");
        setIsLoading(false);
      }
    } catch (err: any) {
      console.error("Payment submission error:", err);
      setPaymentError(err.message || "An unexpected error occurred.");
      onError(err.message || "An unexpected error occurred");
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="bg-[#FAF3EA] p-4 rounded-xl border border-[#E7C7CF]">
        <div className="flex justify-between items-center mb-4">
          <span className="text-sm font-semibold text-[#33101F]">
            Order Total
          </span>
          <span className="text-xl font-['Baloo_2','Trebuchet_MS',sans-serif] font-bold text-[#C42348]">
            ${amount.toFixed(2)}
          </span>
        </div>
        <p className="text-xs text-[#8C6B76] font-['Inter','Segoe UI',system-ui,sans-serif]">
          Order #{orderReference || orderId.slice(-6)}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="bg-white rounded-xl border border-[#E7C7CF] p-4">
          <PaymentElement
            options={{
              layout: "tabs",
              business: { name: "Hinarok" },
            }}
          />
        </div>

        {paymentError && (
          <div className="bg-[#C42348]/10 border border-[#C42348]/20 text-[#C42348] p-3 rounded-xl text-sm font-['Inter','Segoe UI',system-ui,sans-serif]">
            ⚠️ {paymentError}
          </div>
        )}

        {paymentSuccess && (
          <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 p-3 rounded-xl text-sm font-['Inter','Segoe UI',system-ui,sans-serif]">
            ✅ Payment successful! Your order has been confirmed.
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-3 pt-2">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 bg-[#FAF3EA] hover:bg-[#E7C7CF] text-[#33101F] font-semibold py-3 rounded-xl transition-all font-['Inter','Segoe UI',system-ui,sans-serif] text-sm"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={!stripe || isLoading || paymentSuccess}
            className="flex-1 bg-[#C42348] hover:bg-[#E84C6B] disabled:bg-[#8C6B76] text-white font-bold py-3 rounded-xl transition-all flex items-center justify-center gap-2 font-['Inter','Segoe UI',system-ui,sans-serif] text-sm"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Processing...
              </>
            ) : paymentSuccess ? (
              "✅ Paid"
            ) : (
              "Pay Now"
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

// ============================================
// STRIPE PAYMENT WRAPPER
// ============================================
const StripePaymentWrapper = ({
  clientSecret,
  orderId,
  orderReference,
  onSuccess,
  onError,
  onCancel,
  amount,
}: {
  clientSecret: string;
  orderId: string;
  orderReference: string;
  onSuccess: () => void;
  onError: (error: string) => void;
  onCancel: () => void;
  amount: number;
}) => {
  const options = {
    clientSecret,
    appearance: {
      theme: "stripe",
      variables: {
        colorPrimary: "#C42348",
        colorBackground: "#ffffff",
        colorText: "#33101F",
        fontFamily: "Inter, Segoe UI, system-ui, sans-serif",
        borderRadius: "12px",
      },
    },
  };

  return (
    <Elements stripe={stripePromise} options={options}>
      <StripePaymentForm
        clientSecret={clientSecret}
        orderId={orderId}
        orderReference={orderReference}
        onSuccess={onSuccess}
        onError={onError}
        onCancel={onCancel}
        amount={amount}
      />
    </Elements>
  );
};

// ============================================
// MAIN CUSTOMER ORDERING COMPONENT
// ============================================
export default function CustomerOrdering() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();

  // ✅ FIX: Redirect dash-based slugs to non-dash versions
  useEffect(() => {
    // If the slug contains a dash, redirect to the non-dash version
    if (slug && slug.includes("-")) {
      const noDashSlug = slug.replace(/-/g, "");
      console.log(`🔄 Redirecting dash slug: ${slug} → ${noDashSlug}`);
      navigate(`/restaurant/${noDashSlug}`, { replace: true });
      return;
    }

    // Also check subdomain for dash
    const hostname = window.location.hostname;
    const isMainDomain =
      hostname === "hinarok.com" ||
      hostname === "www.hinarok.com" ||
      hostname === "localhost" ||
      hostname.includes("vercel.app");

    if (!isMainDomain) {
      const subdomain = hostname.split(".")[0];
      if (subdomain && subdomain.includes("-")) {
        const noDashSubdomain = subdomain.replace(/-/g, "");
        const newUrl = `https://${noDashSubdomain}.${hostname.split(".").slice(1).join(".")}`;
        console.log(
          `🔄 Redirecting dash subdomain: ${subdomain} → ${noDashSubdomain}`,
        );
        window.location.href = newUrl;
        return;
      }
    }
  }, [slug, navigate]);

  // Load state from API
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [dataLoaded, setDataLoaded] = useState(false);

  // Find current restaurant
  const [currentRestaurant, setCurrentRestaurant] = useState<Restaurant | null>(
    null,
  );

  // Stripe payment state
  const [showStripePayment, setShowStripePayment] = useState(false);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [pendingOrderId, setPendingOrderId] = useState<string | null>(null);
  const [pendingOrderRef, setPendingOrderRef] = useState<string | null>(null);
  const [pendingOrderTotal, setPendingOrderTotal] = useState<number>(0);
  const [isPlacingOrder, setIsPlacingOrder] = useState(false);
  const [orderPlacementError, setOrderPlacementError] = useState<string | null>(
    null,
  );

  // Refs for cleanup
  const fetchAbortControllerRef = useRef<AbortController | null>(null);

  // ✅ FIX: Normalize slug (remove dashes for comparison)
  const normalizeSlug = (value: string) => {
    if (!value) return "";
    return value.toLowerCase().replace(/-/g, "");
  };

  // Detect if we're on a subdomain
  const getSubdomainFromHost = () => {
    const hostname = window.location.hostname;
    if (
      hostname === "hinarok.com" ||
      hostname === "www.hinarok.com" ||
      hostname === "localhost" ||
      hostname === "bitepickup.vercel.app" ||
      hostname.includes("vercel.app")
    ) {
      return null;
    }
    const parts = hostname.split(".");
    if (parts.length > 2) {
      return parts[0];
    }
    return null;
  };

  useEffect(() => {
    // Cancel any pending fetch
    if (fetchAbortControllerRef.current) {
      fetchAbortControllerRef.current.abort();
    }

    const controller = new AbortController();
    fetchAbortControllerRef.current = controller;

    const loadData = async () => {
      try {
        setLoading(true);
        setDataLoaded(false);

        // Clear previous data to prevent showing stale data
        setCurrentRestaurant(null);
        setCategories([]);
        setMenuItems([]);

        // Get all restaurants from API - fresh fetch
        const resData = await getRestaurants();

        // Filter out inactive restaurants - ONLY ACTIVE ONES
        const activeRestaurants = resData.filter((r) => r.isActive !== false);
        setRestaurants(activeRestaurants);

        let found = null;
        const subdomain = getSubdomainFromHost();

        // Determine the lookup key - prioritize slug from URL, then subdomain
        let lookupKey = slug;
        let isSubdomainLookup = false;

        // If we're on a subdomain and slug is empty, use subdomain as lookup
        if (!lookupKey && subdomain) {
          lookupKey = subdomain;
          isSubdomainLookup = true;
          console.log("🔍 Looking up by subdomain:", lookupKey);
        }

        // If we have a lookup key (slug or subdomain), find the restaurant
        if (lookupKey) {
          const normalizedLookup = normalizeSlug(lookupKey);
          console.log("🔍 Normalized lookup key:", normalizedLookup);

          // Strategy 1: Exact match on slug
          found = activeRestaurants.find((r) => r.slug === lookupKey);

          // Strategy 2: Exact match on subdomain
          if (!found) {
            found = activeRestaurants.find((r) => r.subdomain === lookupKey);
          }

          // Strategy 3: Case-insensitive match
          if (!found) {
            const lowerLookup = lookupKey.toLowerCase();
            found = activeRestaurants.find(
              (r) =>
                r.slug?.toLowerCase() === lowerLookup ||
                r.subdomain?.toLowerCase() === lowerLookup,
            );
          }

          // Strategy 4: Normalized match (remove dashes for comparison)
          if (!found) {
            found = activeRestaurants.find((r) => {
              const normalizedSlug = normalizeSlug(r.slug || "");
              const normalizedSubdomain = normalizeSlug(r.subdomain || "");
              return (
                normalizedSlug === normalizedLookup ||
                normalizedSubdomain === normalizedLookup
              );
            });
          }

          // Strategy 5: Partial match (contains the lookup key)
          if (!found) {
            found = activeRestaurants.find((r) => {
              const slugLower = (r.slug || "").toLowerCase();
              const subdomainLower = (r.subdomain || "").toLowerCase();
              const lookupLower = lookupKey.toLowerCase();
              return (
                slugLower.includes(lookupLower) ||
                subdomainLower.includes(lookupLower)
              );
            });
          }

          if (found) {
            console.log("🔍 Found ACTIVE restaurant:", found.name);
          } else {
            // Check if the restaurant exists but is inactive
            const existsButInactive = resData.find((r) => {
              const normalizedR = normalizeSlug(r.slug || "");
              const normalizedRSub = normalizeSlug(r.subdomain || "");
              return (
                normalizedR === normalizedLookup ||
                normalizedRSub === normalizedLookup
              );
            });
            if (existsButInactive) {
              console.log(
                "⚠️ Restaurant exists but is INACTIVE:",
                existsButInactive.name,
              );
              setCurrentRestaurant(null);
              setDataLoaded(true);
              setLoading(false);
              return;
            }
            console.log("❌ No restaurant found for:", lookupKey);
          }
        }

        // If no restaurant found by lookup key, and we're on a subdomain, try ALL active restaurants
        if (!found && subdomain) {
          console.log(
            "🔍 Trying fallback: check all active restaurants by subdomain contains",
          );
          const normalizedSubdomain = normalizeSlug(subdomain);

          found = activeRestaurants.find((r) => {
            const normalizedRSub = normalizeSlug(r.subdomain || "");
            const normalizedRSlug = normalizeSlug(r.slug || "");
            return (
              normalizedRSub.includes(normalizedSubdomain) ||
              normalizedRSlug.includes(normalizedSubdomain)
            );
          });

          if (found) {
            console.log("🔍 Found by fallback:", found.name);
          }
        }

        // Try localStorage only if we still don't have a match
        if (!found) {
          try {
            const stored = localStorage.getItem("currentRestaurant");
            if (stored) {
              const parsed = JSON.parse(stored);
              // Verify the stored restaurant matches the lookup key using normalized comparison
              let matchesLookup = false;
              if (lookupKey) {
                const normalizedLookup = normalizeSlug(lookupKey);
                const normalizedParsedSlug = normalizeSlug(parsed.slug || "");
                const normalizedParsedSub = normalizeSlug(
                  parsed.subdomain || "",
                );
                matchesLookup =
                  normalizedParsedSlug === normalizedLookup ||
                  normalizedParsedSub === normalizedLookup;
              } else if (subdomain) {
                const normalizedSubdomain = normalizeSlug(subdomain);
                const normalizedParsedSlug = normalizeSlug(parsed.slug || "");
                const normalizedParsedSub = normalizeSlug(
                  parsed.subdomain || "",
                );
                matchesLookup =
                  normalizedParsedSlug === normalizedSubdomain ||
                  normalizedParsedSub === normalizedSubdomain;
              }

              if (matchesLookup) {
                const verified = activeRestaurants.find(
                  (r) => r.id === parsed.id,
                );
                if (verified) {
                  found = verified;
                  console.log(
                    "🔍 Found restaurant from localStorage (verified):",
                    found.name,
                  );
                } else {
                  localStorage.removeItem("currentRestaurant");
                  localStorage.removeItem("currentRestaurantId");
                }
              }
            }
          } catch (e) {
            console.log("No valid restaurant in storage");
          }
        }

        // IMPORTANT: If we're on a restaurant URL (has slug or subdomain) and we didn't find an ACTIVE match,
        // show "Restaurant Not Found"
        const isRestaurantUrl = slug || subdomain;
        if (!found && isRestaurantUrl) {
          setCurrentRestaurant(null);
          setDataLoaded(true);
          setLoading(false);
          return;
        }

        if (found) {
          // Set the current restaurant
          setCurrentRestaurant(found);
          setCurrentRestaurantId(found.id);

          // Save restaurant data to localStorage for Header to use
          const restaurantData = {
            name: found.name,
            logo: found.logo || "",
            id: found.id,
            slug: found.slug,
            subdomain: found.subdomain,
          };
          localStorage.setItem(
            "currentRestaurant",
            JSON.stringify(restaurantData),
          );

          // Load categories and menu items for this restaurant
          const catData = await getCategories(found.id);
          setCategories(catData);

          const menuData = await getMenuItems(found.id);
          setMenuItems(menuData);

          setDataLoaded(true);
        } else {
          // No active restaurants found and no specific URL
          setCurrentRestaurant(null);
          setDataLoaded(true);
        }
      } catch (error) {
        if (error instanceof Error && error.name === "AbortError") {
          console.log("Fetch aborted");
          return;
        }
        console.error("Failed to load data:", error);
        setDataLoaded(true);
      } finally {
        setLoading(false);
      }
    };

    loadData();

    // Cleanup function
    return () => {
      if (fetchAbortControllerRef.current) {
        fetchAbortControllerRef.current.abort();
      }
    };
  }, [slug]); // Re-run when slug changes

  // Cart state
  const [cart, setCart] = useState<CartItem[]>([]);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [checkoutStep, setCheckoutStep] = useState<
    "menu" | "checkout" | "processing" | "payment" | "success"
  >("menu");

  // Mobile Bottom Sheet States
  const [isCartSheetOpen, setIsCartSheetOpen] = useState(false);
  const [isItemSheetOpen, setIsItemSheetOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null);
  const [itemQuantity, setItemQuantity] = useState(1);
  const [itemSpecialInstructions, setItemSpecialInstructions] = useState("");

  // Checkout Form states
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [pickupOption, setPickupOption] = useState<"ASAP" | "scheduled">(
    "ASAP",
  );
  const [scheduledTime, setScheduledTime] = useState("12:00 PM");
  const [paymentChoice, setPaymentChoice] = useState<"online" | "pickup">(
    "online",
  );
  const [recentOrderId, setRecentOrderId] = useState<string>("");
  const [specialInstructions, setSpecialInstructions] = useState("");
  const [placedOrderReceipt, setPlacedOrderReceipt] = useState<{
    subtotal: number;
    taxes: number;
    serviceFee: number;
    total: number;
    specialInstructions?: string;
  } | null>(null);

  const [formErrors, setFormErrors] = useState<{
    name?: string;
    phone?: string;
  }>({});

  // Filter items & categories for this restaurant - only if currentRestaurant exists
  const filteredCategories = currentRestaurant
    ? categories.filter((c) => c.restaurantId === currentRestaurant.id)
    : [];

  // ✅ FIX: Filter out ONLY 'hidden' items, keep 'out_of_stock' items visible
  const filteredMenuItems = currentRestaurant
    ? menuItems.filter((i) => {
        if (i.restaurantId !== currentRestaurant.id) return false;
        // Only hide items that are explicitly marked as 'hidden'
        // 'out_of_stock' items should still be visible with a label
        return i.availability !== "hidden";
      })
    : [];

  // Set default pickup option based on allowed parameters
  useEffect(() => {
    if (currentRestaurant) {
      const asapAllowed = currentRestaurant.pickupSettings?.allowAsap !== false;
      const scheduledAllowed =
        currentRestaurant.pickupSettings?.allowScheduled !== false;
      if (!asapAllowed && scheduledAllowed) {
        setPickupOption("scheduled");
      } else {
        setPickupOption("ASAP");
      }
    }
  }, [currentRestaurant?.id]);

  // Default active category - reset when categories change
  useEffect(() => {
    if (filteredCategories.length > 0) {
      // Check if active category is still valid
      const isValid = filteredCategories.some((c) => c.id === activeCategory);
      if (!isValid || !activeCategory) {
        setActiveCategory(filteredCategories[0].id);
      }
    } else {
      setActiveCategory(null);
    }
  }, [filteredCategories, activeCategory]);

  // Reset item sheet when opened
  useEffect(() => {
    if (selectedItem) {
      const existingInCart = cart.find((i) => i.menuItemId === selectedItem.id);
      setItemQuantity(existingInCart?.quantity || 1);
      setItemSpecialInstructions("");
    }
  }, [selectedItem, cart]);

  // ====== SCROLL SPY: Auto-scrolling category tabs ======
  const categoryRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});
  const categoryObserverRef = useRef<IntersectionObserver | null>(null);
  const [isScrolling, setIsScrolling] = useState(false);
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const categoryContainerRef = useRef<HTMLDivElement | null>(null);

  // State for sticky category bar
  const [isCategorySticky, setIsCategorySticky] = useState(false);

  // ====== STICKY CATEGORY BAR LOGIC ======
  useEffect(() => {
    // Get the category bar element
    const categoryBar = categoryContainerRef.current;
    if (!categoryBar) return;

    // Get the header height (approximate - the main navigation bar)
    const headerHeight = 64; // Height of the main header (h-16)

    const handleScroll = () => {
      // Get the position of the category bar relative to the viewport
      const rect = categoryBar.getBoundingClientRect();

      // When the top of the category bar reaches the top of the viewport minus header height
      // It should become sticky
      const shouldBeSticky = rect.top <= headerHeight;

      if (shouldBeSticky !== isCategorySticky) {
        setIsCategorySticky(shouldBeSticky);
      }
    };

    // Add scroll listener
    window.addEventListener("scroll", handleScroll, { passive: true });
    // Initial check
    handleScroll();

    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, [isCategorySticky]);

  // Set up IntersectionObserver for Scroll Spy
  useEffect(() => {
    if (filteredCategories.length === 0) return;

    // Clean up previous observer
    if (categoryObserverRef.current) {
      categoryObserverRef.current.disconnect();
    }

    // Create new observer
    categoryObserverRef.current = new IntersectionObserver(
      (entries) => {
        // Find the category that is most visible
        let bestEntry = null;
        let bestRatio = 0;

        entries.forEach((entry) => {
          if (entry.isIntersecting && entry.intersectionRatio > bestRatio) {
            bestRatio = entry.intersectionRatio;
            bestEntry = entry;
          }
        });

        // If we found a visible category and we're not currently scrolling programmatically
        if (bestEntry && !isScrolling) {
          const categoryId = bestEntry.target.id.replace("category-", "");
          if (categoryId && categoryId !== activeCategory) {
            setActiveCategory(categoryId);
            // Auto-scroll the category bar to show the active category
            scrollCategoryIntoView(categoryId);
          }
        }
      },
      {
        root: null,
        rootMargin: "-120px 0px -60% 0px",
        threshold: [0, 0.1, 0.2, 0.3, 0.4, 0.5],
      },
    );

    // Observe each category section
    Object.values(categoryRefs.current).forEach((ref) => {
      if (ref) {
        categoryObserverRef.current?.observe(ref);
      }
    });

    return () => {
      if (categoryObserverRef.current) {
        categoryObserverRef.current.disconnect();
      }
    };
  }, [filteredCategories, activeCategory, isScrolling]);

  // Auto-scroll the category bar horizontally to show the active category
  const scrollCategoryIntoView = (categoryId: string) => {
    if (!categoryContainerRef.current) return;

    // Find the button for this category
    const buttons = categoryContainerRef.current.querySelectorAll("button");
    let targetButton: HTMLButtonElement | null = null;

    buttons.forEach((btn) => {
      if (
        btn.textContent?.trim() ===
        filteredCategories.find((c) => c.id === categoryId)?.name
      ) {
        targetButton = btn;
      }
    });

    if (targetButton) {
      const container = categoryContainerRef.current;
      const buttonRect = targetButton.getBoundingClientRect();
      const containerRect = container.getBoundingClientRect();

      // Calculate scroll position to center the button
      const scrollLeft =
        container.scrollLeft +
        (buttonRect.left - containerRect.left) -
        containerRect.width / 2 +
        buttonRect.width / 2;

      container.scrollTo({
        left: Math.max(0, scrollLeft),
        behavior: "smooth",
      });
    }
  };

  // Handle category click (manual scroll)
  const handleCategoryClick = (categoryId: string) => {
    setActiveCategory(categoryId);
    setIsScrolling(true);

    const element = document.getElementById(`category-${categoryId}`);
    if (element) {
      // Account for the sticky category bar height
      const stickyOffset = isCategorySticky ? 64 : 0;
      const yOffset = -120 + stickyOffset;
      const y =
        element.getBoundingClientRect().top + window.pageYOffset + yOffset;
      window.scrollTo({ top: y, behavior: "smooth" });
    }

    // Scroll the category bar to show the clicked category
    scrollCategoryIntoView(categoryId);

    // Reset scrolling flag after animation completes
    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current);
    }
    scrollTimeoutRef.current = setTimeout(() => {
      setIsScrolling(false);
    }, 800);
  };

  // Clean up timeout on unmount
  useEffect(() => {
    return () => {
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
    };
  }, []);

  // Handle item card click for mobile
  // ✅ FIX: Don't open sheet for out of stock items
  const handleItemClick = (item: MenuItem) => {
    if (item.availability === "out_of_stock") return;

    if (window.innerWidth < 768) {
      setSelectedItem(item);
      const existingInCart = cart.find((i) => i.menuItemId === item.id);
      setItemQuantity(existingInCart?.quantity || 1);
      setItemSpecialInstructions(existingInCart?.specialInstructions || "");
      setIsItemSheetOpen(true);
    }
  };

  // Handle add from item sheet
  const handleAddFromSheet = () => {
    if (selectedItem) {
      // Remove existing item from cart if present
      const existing = cart.find((i) => i.menuItemId === selectedItem.id);
      if (existing) {
        removeFromCart(selectedItem.id);
      }
      addToCart(selectedItem, itemQuantity, itemSpecialInstructions);
      setIsItemSheetOpen(false);
      setSelectedItem(null);
    }
  };

  if (loading || !dataLoaded) {
    return (
      <div className="min-h-screen bg-[#FAF3EA] flex flex-col items-center justify-center p-6 text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#C42348] mb-4"></div>
        <p className="text-[#8C6B76] text-sm font-['Inter','Segoe UI',system-ui,sans-serif]">
          Loading menu...
        </p>
      </div>
    );
  }

  if (!currentRestaurant) {
    return (
      <div className="min-h-screen bg-[#FAF3EA] flex flex-col items-center justify-center p-6 text-center">
        <Utensils className="w-12 h-12 text-[#8C6B76] mb-3" />
        <h2 className="text-xl font-['Baloo_2','Trebuchet_MS',sans-serif] font-semibold text-[#33101F]">
          Restaurant Not Found
        </h2>
        <p className="text-[#8C6B76] text-sm mt-1 max-w-xs font-['Inter','Segoe UI',system-ui,sans-serif]">
          This restaurant is currently not available or has been deactivated.
          Please check the URL or go back to the homepage.
        </p>
        <Link
          to="/"
          className="mt-6 inline-flex items-center gap-2 bg-[#C42348] hover:bg-[#E84C6B] text-white px-6 py-2.5 rounded-xl font-semibold text-sm transition-colors font-['Inter','Segoe UI',system-ui,sans-serif]"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Home
        </Link>
      </div>
    );
  }

  // Cart Operations
  const addToCart = (
    item: MenuItem,
    quantity: number = 1,
    instructions: string = "",
  ) => {
    setCart((prev) => {
      const existing = prev.find((i) => i.menuItemId === item.id);
      if (existing) {
        return prev.map((i) =>
          i.menuItemId === item.id
            ? {
                ...i,
                quantity: i.quantity + quantity,
                specialInstructions: instructions || i.specialInstructions,
              }
            : i,
        );
      }
      return [
        ...prev,
        {
          menuItemId: item.id,
          name: item.name,
          price: item.price,
          quantity: quantity,
          image: item.image,
          specialInstructions: instructions || undefined,
        },
      ];
    });
  };

  const updateQuantity = (menuItemId: string, delta: number) => {
    setCart((prev) => {
      return prev.map((i) => {
        if (i.menuItemId === menuItemId) {
          const newQty = i.quantity + delta;
          return { ...i, quantity: newQty < 1 ? 1 : newQty };
        }
        return i;
      });
    });
  };

  const removeFromCart = (menuItemId: string) => {
    setCart((prev) => prev.filter((i) => i.menuItemId !== menuItemId));
  };

  const cartTotal = cart.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0,
  );
  const itemsInCartCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  // Computed Taxes & Fees
  const taxRate =
    currentRestaurant?.taxesAndFees?.taxRatePercent !== undefined
      ? currentRestaurant.taxesAndFees.taxRatePercent
      : 8.5;
  // ✅ FIX: Service fee defaults to 0
  const serviceFee =
    currentRestaurant?.taxesAndFees?.serviceFeeAmount !== undefined
      ? currentRestaurant.taxesAndFees.serviceFeeAmount
      : 0;
  const taxAmountValue = (cartTotal * taxRate) / 100;
  const finalTotalValue = cartTotal + taxAmountValue + serviceFee;

  // Checkout submission
  const validateForm = () => {
    const errors: { name?: string; phone?: string } = {};
    if (!customerName.trim()) errors.name = "Please enter your full name";
    if (!customerPhone.trim())
      errors.phone = "Please enter a contact phone number";
    else if (customerPhone.replace(/\D/g, "").length < 8)
      errors.phone = "Please enter a valid phone number";

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // ============================================
  // HANDLE PLACE ORDER WITH STRIPE
  // ============================================
  const handlePlaceOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    // Ensure we have the correct restaurant ID
    if (!currentRestaurant || !currentRestaurant.id) {
      alert("Restaurant information is missing. Please try again.");
      return;
    }

    // Prepare order data with proper restaurant ID
    const orderData = {
      restaurantId: currentRestaurant.id,
      restaurantName: currentRestaurant.name,
      customerName: customerName.trim(),
      customerPhone: customerPhone.trim(),
      customerEmail: customerEmail.trim() || undefined,
      items: cart.map((item) => ({
        menuItemId: item.menuItemId,
        name: item.name,
        price: item.price,
        quantity: item.quantity,
        specialInstructions: item.specialInstructions,
      })),
      pickupTimeOption: pickupOption,
      scheduledTime: pickupOption === "scheduled" ? scheduledTime : undefined,
      paymentMethod: paymentChoice,
      specialInstructions: specialInstructions.trim() || undefined,
    };

    console.log(
      "📤 Placing order with data:",
      JSON.stringify(orderData, null, 2),
    );

    setIsPlacingOrder(true);
    setOrderPlacementError(null);

    try {
      const response = await addOrder(orderData);
      console.log("✅ Order placed successfully:", response);

      const newOrder = response.data || response;

      // If payment method is online, show Stripe payment
      if (paymentChoice === "online" && newOrder.clientSecret) {
        setClientSecret(newOrder.clientSecret);
        setPendingOrderId(newOrder._id || newOrder.id);
        setPendingOrderRef(newOrder.orderReference);
        setPendingOrderTotal(newOrder.totalPrice || finalTotalValue);
        setCheckoutStep("payment");
        setShowStripePayment(true);
        setIsPlacingOrder(false);
        return;
      }

      // For pickup payment, go directly to success
      if (paymentChoice === "pickup") {
        setPlacedOrderReceipt({
          subtotal: cartTotal,
          taxes: taxAmountValue,
          serviceFee: serviceFee, // ✅ FIX: Use the serviceFee value (defaults to 0)
          total: finalTotalValue,
          specialInstructions: specialInstructions.trim() || undefined,
        });

        setRecentOrderId(newOrder.id || newOrder.orderReference || "");
        setCart([]);
        setCheckoutStep("success");
        window.scrollTo({ top: 0, behavior: "smooth" });
        setIsPlacingOrder(false);
      }
    } catch (error: any) {
      console.error("❌ Failed to place order:", error);
      setOrderPlacementError(
        error.message || "Failed to place order. Please try again.",
      );
      setIsPlacingOrder(false);
    }
  };

  // ============================================
  // HANDLE STRIPE PAYMENT SUCCESS
  // ============================================
  const handlePaymentSuccess = async () => {
    setShowStripePayment(false);
    setCheckoutStep("success");
    setClientSecret(null);

    // Set receipt data
    setPlacedOrderReceipt({
      subtotal: cartTotal,
      taxes: taxAmountValue,
      serviceFee: serviceFee, // ✅ FIX: Use the serviceFee value (defaults to 0)
      total: finalTotalValue,
      specialInstructions: specialInstructions.trim() || undefined,
    });

    setRecentOrderId(pendingOrderRef || pendingOrderId || "");
    setCart([]);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // ============================================
  // HANDLE STRIPE PAYMENT ERROR
  // ============================================
  const handlePaymentError = (error: string) => {
    setOrderPlacementError(error);
    setShowStripePayment(false);
    setClientSecret(null);
    setPendingOrderId(null);
    setPendingOrderRef(null);
    setCheckoutStep("checkout");
  };

  // ============================================
  // HANDLE STRIPE PAYMENT CANCEL
  // ============================================
  const handlePaymentCancel = () => {
    setShowStripePayment(false);
    setClientSecret(null);
    setPendingOrderId(null);
    setPendingOrderRef(null);
    setCheckoutStep("checkout");
  };

  // Helper lists of pickup hours
  const generateTimeSlots = () => {
    const slots = [];
    const now = new Date();
    let currentHour = now.getHours();
    let currentMin = now.getMinutes() > 30 ? 60 : 30;

    for (let i = 0; i < 12; i++) {
      if (currentMin === 60) {
        currentHour += 1;
        currentMin = 0;
      }
      if (currentHour >= 24) currentHour -= 24;

      const ampm = currentHour >= 12 ? "PM" : "AM";
      const dispHour = currentHour % 12 === 0 ? 12 : currentHour % 12;
      const dispMin = currentMin === 0 ? "00" : currentMin;

      slots.push(`${dispHour}:${dispMin} ${ampm}`);
      currentMin += 30;
    }
    return slots;
  };

  const timeSlots = generateTimeSlots();

  return (
    <div className="min-h-screen bg-[#FAF3EA] text-[#33101F] font-['Inter','Segoe UI',system-ui,sans-serif]">
      {/* 1. Header Banner & Restaurant Bio */}
      {checkoutStep === "menu" && (
        <>
          <div className="relative h-48 md:h-72 bg-[#FAF3EA] overflow-hidden">
            <img
              referrerPolicy="no-referrer"
              src={currentRestaurant.coverImage}
              alt={currentRestaurant.name}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#33101F]/60 via-transparent to-transparent" />
          </div>

          <div className="max-w-5xl mx-auto px-4 relative pb-4 border-b border-[#E7C7CF]">
            {/* Hinarok Branding Bar */}
            <div className="flex items-center justify-between mt-4">
              <div className="flex items-center gap-2">
                <div className="bg-[#C42348] rounded-lg p-1.5">
                  <Store className="w-4 h-4 text-white" />
                </div>
                <span className="text-xs font-bold text-[#8C6B76] uppercase tracking-wider font-['Inter','Segoe UI',system-ui,sans-serif]">
                  Powered by Hinarok
                </span>
              </div>
              {/* ✅ REMOVED: "Restaurant Owner?" button - completely removed */}
            </div>

            {currentRestaurant.isOrderingPaused && (
              <div
                id="ordering-paused-sticky-banner"
                className="bg-[#E8A13B] text-[#33101F] px-4 py-3 rounded-xl font-bold text-xs uppercase flex items-center gap-2 shadow-sm border border-[#E8A13B]/50 my-4 animate-pulse font-['Inter','Segoe UI',system-ui,sans-serif]"
              >
                <span className="w-2 h-2 rounded bg-[#33101F] animate-ping"></span>
                <span>
                  We are temporarily offline and pausing new incoming orders.
                  You can browse the menu, but checkout is disabled.
                </span>
              </div>
            )}

            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mt-6">
              <div className="flex flex-col sm:flex-row sm:items-end gap-3 md:gap-4">
                {/* Logo floats gracefully with proper positive padding/margins beneath the banner rendering */}
                <div className="w-20 h-20 md:w-28 md:h-28 rounded-2xl bg-white p-1 shadow-md border border-[#E7C7CF] overflow-hidden flex-shrink-0 relative z-10">
                  <img
                    referrerPolicy="no-referrer"
                    src={currentRestaurant.logo}
                    alt="Logo"
                    className="w-full h-full object-cover rounded-xl"
                  />
                </div>
                <div className="pb-1">
                  {currentRestaurant.isOrderingPaused ? (
                    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-semibold bg-[#E8A13B]/20 text-[#E8A13B] border border-[#E8A13B]/30 mb-1 font-['Inter','Segoe UI',system-ui,sans-serif]">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#E8A13B] animate-pulse"></span>
                      Ordering Paused
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-100 mb-1 font-['Inter','Segoe UI',system-ui,sans-serif]">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                      Accepting Orders
                    </span>
                  )}
                  <h1
                    id="shop-restaurant-name"
                    className="text-2xl md:text-3xl font-['Baloo_2','Trebuchet_MS',sans-serif] font-extrabold tracking-tight text-[#33101F] mt-1"
                  >
                    {currentRestaurant.name}
                  </h1>
                </div>
              </div>
              <div className="flex flex-wrap gap-2 text-xs text-[#8C6B76] py-1 font-medium bg-white rounded-lg p-2.5 max-w-sm border border-[#E7C7CF]">
                <span className="flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-[#8C6B76]" />
                  {currentRestaurant.address}
                </span>
                <span className="text-[#E7C7CF]">|</span>
                <span className="flex items-center gap-1">
                  <Phone className="w-3.5 h-3.5 text-[#8C6B76]" />
                  {currentRestaurant.phone}
                </span>
              </div>
            </div>

            <p className="mt-4 text-sm md:text-base text-[#8C6B76] max-w-3xl leading-relaxed font-['Inter','Segoe UI',system-ui,sans-serif]">
              {currentRestaurant.description}
            </p>
          </div>
        </>
      )}

      {/* Main Grid: Menu Layout */}
      <div
        className={`max-w-5xl mx-auto px-4 py-8 ${cart.length > 0 && checkoutStep === "menu" ? "pb-36 md:pb-8" : "pb-8"}`}
      >
        {checkoutStep === "menu" && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Left Col: Menu categories & Items */}
            <div className="md:col-span-2 space-y-8">
              {/* Category buttons */}
              <div
                ref={categoryContainerRef}
                className={`sticky top-[64px] z-20 bg-[#FAF3EA] py-3 border-b border-[#E7C7CF] flex gap-2 overflow-x-auto scrollbar-none md:overflow-x-visible md:flex-wrap`}
                style={{
                  WebkitOverflowScrolling: "touch",
                  scrollbarWidth: "none",
                }}
              >
                {filteredCategories.map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => handleCategoryClick(cat.id)}
                    className={`px-4 py-2 rounded-full text-xs font-semibold whitespace-nowrap transition-all cursor-pointer font-['Inter','Segoe UI',system-ui,sans-serif'] flex-shrink-0 ${
                      activeCategory === cat.id
                        ? "bg-[#33101F] text-white shadow-sm"
                        : "bg-white text-[#8C6B76] hover:bg-[#E7C7CF]"
                    }`}
                  >
                    {cat.name}
                  </button>
                ))}
              </div>

              {/* Menu lists grouped */}
              {filteredCategories.length === 0 ? (
                <div className="text-center py-12 bg-white rounded-xl border border-dashed border-[#E7C7CF]">
                  <Utensils className="w-10 h-10 text-[#8C6B76] mx-auto mb-2" />
                  <p className="text-[#8C6B76] text-sm font-['Inter','Segoe UI',system-ui,sans-serif]">
                    No dishes added to this menu yet.
                  </p>
                </div>
              ) : (
                filteredCategories.map((cat) => {
                  const categoryItems = filteredMenuItems.filter(
                    (i) => i.categoryId === cat.id,
                  );
                  return (
                    <div
                      key={cat.id}
                      id={`category-${cat.id}`}
                      ref={(el) => {
                        categoryRefs.current[cat.id] = el;
                      }}
                      className="space-y-4 scroll-mt-28"
                    >
                      <h3 className="text-lg font-['Baloo_2','Trebuchet_MS',sans-serif] font-bold text-[#33101F] border-l-4 border-[#33101F] pl-3">
                        {cat.name}
                      </h3>

                      <div className="grid grid-cols-1 sm:grid-cols-1 gap-4">
                        {categoryItems.map((item) => (
                          // ✅ FIX: Show out of stock items with disabled state
                          <div
                            id={`menu-card-${item.id}`}
                            key={item.id}
                            className={`flex gap-4 p-4 rounded-xl border transition-all bg-white ${
                              item.availability === "out_of_stock"
                                ? "border-[#E8A13B]/50 bg-[#FAF3EA] opacity-75 cursor-default"
                                : "border-[#E7C7CF] hover:border-[#C42348] hover:shadow-sm cursor-pointer md:cursor-default"
                            }`}
                            onClick={() => {
                              if (item.availability !== "out_of_stock") {
                                handleItemClick(item);
                              }
                            }}
                          >
                            <div className="flex-1 space-y-1">
                              <h4 className="font-['Baloo_2','Trebuchet_MS',sans-serif] font-semibold text-[#33101F] text-sm md:text-base">
                                {item.name}
                              </h4>
                              <p className="text-xs text-[#8C6B76] line-clamp-2 leading-relaxed font-['Inter','Segoe UI',system-ui,sans-serif]">
                                {item.description}
                              </p>
                              <div className="pt-2 text-sm md:text-base font-['Baloo_2','Trebuchet_MS',sans-serif] font-bold text-[#C42348]">
                                ${item.price.toFixed(2)}
                              </div>
                            </div>

                            <div className="w-20 h-20 md:w-24 md:h-24 rounded-lg bg-[#FAF3EA] overflow-hidden relative flex-shrink-0">
                              <img
                                referrerPolicy="no-referrer"
                                src={item.image}
                                alt={item.name}
                                className="w-full h-full object-cover"
                              />
                              {/* ✅ FIX: Show "Out of Stock" label on the image */}
                              {item.availability === "out_of_stock" && (
                                <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                                  <span className="bg-[#E8A13B] text-[#33101F] text-[10px] font-bold px-2 py-1 rounded-full rotate-[-15deg] shadow-md uppercase tracking-wider">
                                    Out of Stock
                                  </span>
                                </div>
                              )}
                              <button
                                id={`add-btn-${item.id}`}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (item.availability !== "out_of_stock") {
                                    addToCart(item);
                                  }
                                }}
                                disabled={item.availability === "out_of_stock"}
                                className={`absolute bottom-1 right-1 bg-white hover:bg-[#C42348] hover:text-white text-[#33101F] w-7 h-7 rounded-full shadow-lg flex items-center justify-center font-bold transition-all border border-[#E7C7CF] ${
                                  item.availability === "out_of_stock"
                                    ? "opacity-50 cursor-not-allowed hover:bg-white hover:text-[#33101F]"
                                    : "cursor-pointer"
                                }`}
                                title={
                                  item.availability === "out_of_stock"
                                    ? "Out of Stock"
                                    : "Add to order"
                                }
                              >
                                {item.availability === "out_of_stock" ? (
                                  <X className="w-4 h-4" />
                                ) : (
                                  <Plus className="w-4 h-4" />
                                )}
                              </button>
                            </div>
                          </div>
                        ))}

                        {categoryItems.length === 0 && (
                          <p className="text-[#8C6B76] text-xs italic py-2 pl-4 font-['Inter','Segoe UI',system-ui,sans-serif]">
                            No active dishes in this category.
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Right Col: Standard Cart preview (Desktop) */}
            <div className="hidden md:block col-span-1">
              <div className="bg-white rounded-2xl p-5 border border-[#E7C7CF] sticky top-20">
                <div className="flex items-center justify-between pb-4 border-b border-[#E7C7CF]">
                  <h3 className="font-['Baloo_2','Trebuchet_MS',sans-serif] font-bold flex items-center gap-2 text-[#33101F]">
                    <ShoppingBag className="w-4.5 h-4.5 text-[#8C6B76]" />
                    <span>Your Order</span>
                  </h3>
                  <span className="text-xs font-semibold bg-[#33101F] text-white px-2 py-0.5 rounded-full font-['Inter','Segoe UI',system-ui,sans-serif]">
                    {itemsInCartCount} items
                  </span>
                </div>

                <div className="mt-4 space-y-4 max-h-[350px] overflow-y-auto pr-1">
                  {cart.length === 0 ? (
                    <div className="text-center py-8 text-[#8C6B76]">
                      <p className="text-sm font-['Inter','Segoe UI',system-ui,sans-serif]">
                        Double tap any dish item to build your gourmet basket.
                      </p>
                    </div>
                  ) : (
                    cart.map((item) => (
                      <div
                        key={item.menuItemId}
                        className="flex items-start justify-between gap-2 text-xs py-2 border-b border-[#E7C7CF] last:border-0"
                      >
                        <div className="flex-1">
                          <h4 className="font-['Baloo_2','Trebuchet_MS',sans-serif] font-semibold text-[#33101F]">
                            {item.name}
                          </h4>
                          <span className="text-[#8C6B76]">
                            ${(item.price * item.quantity).toFixed(2)}
                          </span>
                          {item.specialInstructions && (
                            <p className="text-[10px] text-[#8C6B76] italic truncate">
                              Note: {item.specialInstructions}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="flex items-center border border-[#E7C7CF] rounded-lg bg-white overflow-hidden">
                            <button
                              onClick={() =>
                                updateQuantity(item.menuItemId, -1)
                              }
                              className="px-1.5 py-1 text-[#8C6B76] hover:bg-[#FAF3EA]"
                            >
                              <Minus className="w-3 h-3" />
                            </button>
                            <span className="px-2 font-mono text-[#33101F] text-[11px]">
                              {item.quantity}
                            </span>
                            <button
                              onClick={() => updateQuantity(item.menuItemId, 1)}
                              className="px-1.5 py-1 text-[#8C6B76] hover:bg-[#FAF3EA]"
                            >
                              <Plus className="w-3 h-3" />
                            </button>
                          </div>
                          <button
                            onClick={() => removeFromCart(item.menuItemId)}
                            className="text-[#8C6B76] hover:text-[#C42348] p-1"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {cart.length > 0 && (
                  <div className="mt-6 pt-4 border-t border-[#E7C7CF] space-y-4">
                    <div className="space-y-1.5 text-xs text-[#8C6B76] border-b border-[#E7C7CF] pb-3">
                      <div className="flex justify-between items-center">
                        <span>Subtotal:</span>
                        <span className="font-medium text-[#33101F]">
                          ${cartTotal.toFixed(2)}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span>Taxes ({taxRate}%):</span>
                        <span className="font-medium text-[#33101F]">
                          ${taxAmountValue.toFixed(2)}
                        </span>
                      </div>
                      {/* ✅ FIX: Show service fee (defaults to 0) */}
                      <div className="flex justify-between items-center">
                        <span>Platform Service Fee:</span>
                        <span className="font-medium text-[#33101F]">
                          ${serviceFee.toFixed(2)}
                        </span>
                      </div>
                    </div>

                    <div className="flex justify-between items-center text-sm font-['Baloo_2','Trebuchet_MS',sans-serif] font-bold text-[#33101F]">
                      <span>Grand Total:</span>
                      <span>${finalTotalValue.toFixed(2)}</span>
                    </div>

                    {currentRestaurant.isOrderingPaused ? (
                      <div className="p-3 bg-[#E8A13B]/10 text-[#E8A13B] font-bold text-[10px] text-center uppercase rounded-lg border border-[#E8A13B]/20 leading-normal font-['Inter','Segoe UI',system-ui,sans-serif]">
                        Ordering currently paused by {currentRestaurant.name}.
                      </div>
                    ) : (
                      <button
                        id="proceed-to-checkout-btn"
                        onClick={() => setCheckoutStep("checkout")}
                        className="w-full bg-[#C42348] hover:bg-[#E84C6B] active:translate-y-px text-white py-3 rounded-xl font-semibold text-xs tracking-wider uppercase transition-all cursor-pointer flex items-center justify-center gap-2 font-['Inter','Segoe UI',system-ui,sans-serif]"
                      >
                        <span>Proceed to Checkout</span>
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* 2. Secure Checkout Interactive Page Form */}
        {checkoutStep === "checkout" && (
          <div className="max-w-2xl mx-auto">
            {/* Back to menu button */}
            <button
              onClick={() => setCheckoutStep("menu")}
              className="flex items-center gap-2 text-[#8C6B76] hover:text-[#33101F] font-semibold text-xs tracking-wider uppercase mb-6 cursor-pointer font-['Inter','Segoe UI',system-ui,sans-serif]"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Modify Order</span>
            </button>

            <div className="bg-white rounded-2xl border border-[#E7C7CF] p-6 sm:p-8 space-y-8">
              <div className="border-b border-[#E7C7CF] pb-4">
                <h2 className="text-xl sm:text-2xl font-['Baloo_2','Trebuchet_MS',sans-serif] font-bold text-[#33101F]">
                  Complete Pickup Order
                </h2>
                <p className="text-xs text-[#8C6B76] mt-1 font-['Inter','Segoe UI',system-ui,sans-serif]">
                  Provide your details to prepare pickup from{" "}
                  {currentRestaurant.name}
                </p>
              </div>

              <form onSubmit={handlePlaceOrder} className="space-y-6">
                {/* Section A: Customer Details */}
                <div className="space-y-4">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-[#8C6B76] flex items-center gap-2 font-['Inter','Segoe UI',system-ui,sans-serif]">
                    <span className="w-4 h-4 rounded-full bg-[#FAF3EA] text-[#8C6B76] flex items-center justify-center text-[10px]">
                      1
                    </span>
                    Contact Information
                  </h3>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-[#33101F] mb-1 font-['Inter','Segoe UI',system-ui,sans-serif]">
                        Your Full Name <span className="text-[#C42348]">*</span>
                      </label>
                      <input
                        id="customer-name-input"
                        type="text"
                        value={customerName}
                        onChange={(e) => {
                          setCustomerName(e.target.value);
                          if (e.target.value.trim())
                            setFormErrors((prev) => ({
                              ...prev,
                              name: undefined,
                            }));
                        }}
                        placeholder="John Doe"
                        className={`w-full px-3.5 py-2 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#C42348] font-['Inter','Segoe UI',system-ui,sans-serif] ${
                          formErrors.name
                            ? "border-[#C42348] bg-[#C42348]/5"
                            : "border-[#E7C7CF]"
                        }`}
                      />
                      {formErrors.name && (
                        <p className="text-[#C42348] text-[11px] mt-1 font-medium font-['Inter','Segoe UI',system-ui,sans-serif]">
                          {formErrors.name}
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-[#33101F] mb-1 font-['Inter','Segoe UI',system-ui,sans-serif]">
                        Contact Phone Number{" "}
                        <span className="text-[#C42348]">*</span>
                      </label>
                      <input
                        id="customer-phone-input"
                        type="tel"
                        value={customerPhone}
                        onChange={(e) => {
                          setCustomerPhone(e.target.value);
                          if (e.target.value.trim())
                            setFormErrors((prev) => ({
                              ...prev,
                              phone: undefined,
                            }));
                        }}
                        placeholder="(555) 000-0000"
                        className={`w-full px-3.5 py-2 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#C42348] font-['Inter','Segoe UI',system-ui,sans-serif] ${
                          formErrors.phone
                            ? "border-[#C42348] bg-[#C42348]/5"
                            : "border-[#E7C7CF]"
                        }`}
                      />
                      {formErrors.phone && (
                        <p className="text-[#C42348] text-[11px] mt-1 font-medium font-['Inter','Segoe UI',system-ui,sans-serif]">
                          {formErrors.phone}
                        </p>
                      )}
                    </div>

                    <div className="sm:col-span-2">
                      <label className="block text-xs font-semibold text-[#33101F] mb-1 font-['Inter','Segoe UI',system-ui,sans-serif]">
                        Email Address{" "}
                        <span className="text-[#8C6B76]">
                          (optional, for order updates)
                        </span>
                      </label>
                      <input
                        id="customer-email-input"
                        type="email"
                        value={customerEmail}
                        onChange={(e) => setCustomerEmail(e.target.value)}
                        placeholder="you@example.com"
                        className="w-full px-3.5 py-2 border border-[#E7C7CF] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#C42348] font-['Inter','Segoe UI',system-ui,sans-serif]"
                      />
                    </div>
                  </div>
                </div>

                {/* Section B: Pickup Scheduling */}
                <div className="space-y-4 pt-4 border-t border-[#E7C7CF]">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-[#8C6B76] flex items-center gap-2 font-['Inter','Segoe UI',system-ui,sans-serif]">
                    <span className="w-4 h-4 rounded-full bg-[#FAF3EA] text-[#8C6B76] flex items-center justify-center text-[10px]">
                      2
                    </span>
                    Select Pickup Timing
                  </h3>

                  <div className="grid grid-cols-2 gap-3">
                    {currentRestaurant.pickupSettings?.allowAsap !== false && (
                      <button
                        id="pickup-asap-btn"
                        type="button"
                        onClick={() => setPickupOption("ASAP")}
                        className={`p-4 rounded-xl border text-left flex items-start gap-3 transition-all cursor-pointer ${
                          pickupOption === "ASAP"
                            ? "border-[#C42348] bg-[#C42348]/5 ring-1 ring-[#C42348]"
                            : "border-[#E7C7CF] hover:border-[#C42348]"
                        }`}
                      >
                        <Clock className="w-5 h-5 text-[#C42348] flex-shrink-0 mt-0.5" />
                        <div>
                          <h4 className="font-['Baloo_2','Trebuchet_MS',sans-serif] font-bold text-xs text-[#33101F]">
                            ASAP
                          </h4>
                          <p className="text-[10px] text-[#8C6B76] mt-0.5 font-['Inter','Segoe UI',system-ui,sans-serif]">
                            Ready in{" "}
                            {currentRestaurant.pickupSettings
                              ?.prepTimeMinutes || 15}{" "}
                            minutes
                          </p>
                        </div>
                      </button>
                    )}

                    {currentRestaurant.pickupSettings?.allowScheduled !==
                      false && (
                      <button
                        id="pickup-scheduled-btn"
                        type="button"
                        onClick={() => setPickupOption("scheduled")}
                        className={`p-4 rounded-xl border text-left flex items-start gap-3 transition-all cursor-pointer ${
                          pickupOption === "scheduled"
                            ? "border-[#C42348] bg-[#C42348]/5 ring-1 ring-[#C42348]"
                            : "border-[#E7C7CF] hover:border-[#C42348]"
                        }`}
                      >
                        <Clock className="w-5 h-5 text-[#C42348] flex-shrink-0 mt-0.5" />
                        <div>
                          <h4 className="font-['Baloo_2','Trebuchet_MS',sans-serif] font-bold text-xs text-[#33101F]">
                            Schedule Later
                          </h4>
                          <p className="text-[10px] text-[#8C6B76] mt-0.5 font-['Inter','Segoe UI',system-ui,sans-serif]">
                            Pick a designated today time
                          </p>
                        </div>
                      </button>
                    )}
                  </div>

                  {pickupOption === "scheduled" && (
                    <div className="w-full sm:w-1/2">
                      <label className="block text-xs font-semibold text-[#33101F] mb-1 font-['Inter','Segoe UI',system-ui,sans-serif]">
                        Select Pickup Time
                      </label>
                      <select
                        id="scheduled-time-select"
                        value={scheduledTime}
                        onChange={(e) => setScheduledTime(e.target.value)}
                        className="w-full px-3.5 py-2 border border-[#E7C7CF] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#C42348] bg-white font-['Inter','Segoe UI',system-ui,sans-serif]"
                      >
                        {timeSlots.map((slot) => (
                          <option key={slot} value={slot}>
                            {slot}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>

                {/* Section C: Payment Selection */}
                <div className="space-y-4 pt-4 border-t border-[#E7C7CF]">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-[#8C6B76] flex items-center gap-2 font-['Inter','Segoe UI',system-ui,sans-serif]">
                    <span className="w-4 h-4 rounded-full bg-[#FAF3EA] text-[#8C6B76] flex items-center justify-center text-[10px]">
                      3
                    </span>
                    Choose Payment Option
                  </h3>

                  <div className="grid grid-cols-2 gap-3">
                    <button
                      id="pay-online-btn"
                      type="button"
                      onClick={() => setPaymentChoice("online")}
                      className={`p-4 rounded-xl border text-left flex items-start gap-3 transition-all cursor-pointer ${
                        paymentChoice === "online"
                          ? "border-[#C42348] bg-[#C42348]/5 ring-1 ring-[#C42348]"
                          : "border-[#E7C7CF] hover:border-[#C42348]"
                      }`}
                    >
                      <CreditCard className="w-5 h-5 text-[#C42348] flex-shrink-0 mt-0.5" />
                      <div>
                        <h4 className="font-['Baloo_2','Trebuchet_MS',sans-serif] font-bold text-xs text-[#33101F]">
                          Pay Online
                        </h4>
                        <p className="text-[10px] text-[#8C6B76] mt-0.5 font-['Inter','Segoe UI',system-ui,sans-serif]">
                          Secure card payment powered by Stripe
                        </p>
                      </div>
                    </button>

                    <button
                      id="pay-at-pickup-btn"
                      type="button"
                      onClick={() => setPaymentChoice("pickup")}
                      className={`p-4 rounded-xl border text-left flex items-start gap-3 transition-all cursor-pointer ${
                        paymentChoice === "pickup"
                          ? "border-[#C42348] bg-[#C42348]/5 ring-1 ring-[#C42348]"
                          : "border-[#E7C7CF] hover:border-[#C42348]"
                      }`}
                    >
                      <CreditCard className="w-5 h-5 text-[#C42348] flex-shrink-0 mt-0.5" />
                      <div>
                        <h4 className="font-['Baloo_2','Trebuchet_MS',sans-serif] font-bold text-xs text-[#33101F]">
                          Pay At Pickup
                        </h4>
                        <p className="text-[10px] text-[#8C6B76] mt-0.5 font-['Inter','Segoe UI',system-ui,sans-serif]">
                          Settle with store in cash/card
                        </p>
                      </div>
                    </button>
                  </div>
                </div>

                {/* Special Instructions */}
                <div className="space-y-3 pt-4 border-t border-[#E7C7CF]">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-[#8C6B76] flex items-center gap-2 font-['Inter','Segoe UI',system-ui,sans-serif]">
                    <span className="w-4 h-4 rounded-full bg-[#FAF3EA] text-[#8C6B76] flex items-center justify-center text-[10px]">
                      4
                    </span>
                    Special Instructions (optional)
                  </h3>
                  <div>
                    <textarea
                      id="special-instructions-textarea"
                      value={specialInstructions}
                      onChange={(e) => setSpecialInstructions(e.target.value)}
                      placeholder="e.g. Please specify allergies, request utensils, or add kitchen notes..."
                      rows={2}
                      className="w-full px-3.5 py-2 border border-[#E7C7CF] rounded-xl text-xs text-[#33101F] focus:outline-none focus:ring-2 focus:ring-[#C42348] font-['Inter','Segoe UI',system-ui,sans-serif] text-base md:text-xs"
                    />
                  </div>
                  <p className="text-[10px] text-[#8C6B76] font-['Inter','Segoe UI',system-ui,sans-serif]">
                    No substitutes. Additions may be charged extra.
                  </p>
                </div>

                {/* Summary Cart Block */}
                <div className="p-4 rounded-xl bg-[#FAF3EA] border border-[#E7C7CF] text-xs text-[#8C6B76] space-y-2">
                  <div className="font-['Baloo_2','Trebuchet_MS',sans-serif] font-bold text-[#33101F] border-b border-[#E7C7CF] pb-1.5 text-sm">
                    Basket Summary:
                  </div>
                  <div className="space-y-1">
                    {cart.map((item) => (
                      <div
                        key={item.menuItemId}
                        className="flex justify-between"
                      >
                        <span>
                          {item.quantity}x {item.name}
                        </span>
                        <span>${(item.price * item.quantity).toFixed(2)}</span>
                      </div>
                    ))}
                  </div>

                  <div className="space-y-1 pt-1.5 border-t border-[#E7C7CF] text-[10px]">
                    <div className="flex justify-between">
                      <span>Subtotal:</span>
                      <span>${cartTotal.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Taxes ({taxRate}%):</span>
                      <span>${taxAmountValue.toFixed(2)}</span>
                    </div>
                    {/* ✅ FIX: Show service fee (defaults to 0) */}
                    <div className="flex justify-between">
                      <span>Platform Service Fee:</span>
                      <span>${serviceFee.toFixed(2)}</span>
                    </div>
                  </div>

                  <div className="border-t border-[#E7C7CF] pt-1.5 flex justify-between font-['Baloo_2','Trebuchet_MS',sans-serif] font-bold text-[#33101F] text-sm">
                    <span>Order Total:</span>
                    <span>${finalTotalValue.toFixed(2)}</span>
                  </div>
                </div>

                {orderPlacementError && (
                  <div className="bg-[#C42348]/10 border border-[#C42348]/20 text-[#C42348] p-3 rounded-xl text-sm font-['Inter','Segoe UI',system-ui,sans-serif]">
                    ⚠️ {orderPlacementError}
                  </div>
                )}

                <div className="pt-4">
                  {currentRestaurant.isOrderingPaused ? (
                    <div className="p-3 bg-[#E8A13B]/10 text-[#E8A13B] font-bold text-[10px] text-center uppercase rounded-lg border border-[#E8A13B]/20 leading-normal font-['Inter','Segoe UI',system-ui,sans-serif]">
                      Checkout disabled - Ordering paused by{" "}
                      {currentRestaurant.name}
                    </div>
                  ) : (
                    <button
                      id="place-order-submit-btn"
                      type="submit"
                      disabled={isPlacingOrder}
                      className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:bg-[#8C6B76] text-white font-['Baloo_2','Trebuchet_MS',sans-serif] font-bold py-3.5 rounded-xl transition-all shadow-md cursor-pointer text-sm tracking-wide uppercase flex items-center justify-center gap-2"
                    >
                      {isPlacingOrder ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Processing...
                        </>
                      ) : paymentChoice === "online" ? (
                        <>
                          <CreditCard className="w-4 h-4" />
                          Pay Online (${finalTotalValue.toFixed(2)})
                        </>
                      ) : (
                        <>
                          <CheckCircle className="w-4 h-4" />
                          Place Order (${finalTotalValue.toFixed(2)})
                        </>
                      )}
                    </button>
                  )}
                </div>
              </form>
            </div>
          </div>
        )}

        {/* 2.5 Stripe Payment Processing */}
        {checkoutStep === "payment" && showStripePayment && clientSecret && (
          <div className="max-w-2xl mx-auto">
            {/* Back to checkout button */}
            <button
              onClick={() => {
                setShowStripePayment(false);
                setCheckoutStep("checkout");
              }}
              className="flex items-center gap-2 text-[#8C6B76] hover:text-[#33101F] font-semibold text-xs tracking-wider uppercase mb-6 cursor-pointer font-['Inter','Segoe UI',system-ui,sans-serif]"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Checkout</span>
            </button>

            <div className="bg-white rounded-2xl border border-[#E7C7CF] p-6 sm:p-8 space-y-6">
              <div className="border-b border-[#E7C7CF] pb-4">
                <h2 className="text-xl sm:text-2xl font-['Baloo_2','Trebuchet_MS',sans-serif] font-bold text-[#33101F]">
                  💳 Complete Payment
                </h2>
                <p className="text-xs text-[#8C6B76] mt-1 font-['Inter','Segoe UI',system-ui,sans-serif]">
                  Secure payment for your order from {currentRestaurant.name}
                </p>
              </div>

              <StripePaymentWrapper
                clientSecret={clientSecret}
                orderId={pendingOrderId || ""}
                orderReference={pendingOrderRef || ""}
                amount={pendingOrderTotal || finalTotalValue}
                onSuccess={handlePaymentSuccess}
                onError={handlePaymentError}
                onCancel={handlePaymentCancel}
              />
            </div>
          </div>
        )}

        {/* 3. Success Receipt Notification */}
        {checkoutStep === "success" && (
          <div className="max-w-md mx-auto text-center py-12 px-6">
            <div className="w-16 h-16 rounded-full bg-emerald-50 text-emerald-500 flex items-center justify-center mx-auto mb-4 border border-emerald-100">
              <Check className="w-8 h-8 stroke-[3]" />
            </div>

            <h2
              id="receipt-success-heading"
              className="text-2xl font-['Baloo_2','Trebuchet_MS',sans-serif] font-bold text-[#33101F]"
            >
              {paymentChoice === "online"
                ? "Payment Successful! ✅"
                : "Order Placed Successfully!"}
            </h2>
            <p className="text-[#8C6B76] text-xs mt-1 font-['Inter','Segoe UI',system-ui,sans-serif]">
              Ticket Reference:{" "}
              <strong className="text-[#C42348]">{recentOrderId}</strong>
            </p>

            <div className="bg-white border border-[#E7C7CF] rounded-2xl p-5 my-6 text-left text-xs text-[#8C6B76] space-y-3">
              <div className="text-center font-['Baloo_2','Trebuchet_MS',sans-serif] font-bold text-[#33101F] border-b border-[#E7C7CF] pb-2 text-sm uppercase tracking-wider">
                {currentRestaurant.name} Pickup Ticket
              </div>

              <div className="grid grid-cols-2 gap-y-2">
                <div>Client Name:</div>
                <div className="text-right font-medium text-[#33101F]">
                  {customerName}
                </div>

                <div>Phone:</div>
                <div className="text-right font-medium text-[#33101F]">
                  {customerPhone}
                </div>

                <div>Pickup Timing:</div>
                <div className="text-right font-medium text-[#33101F] capitalize">
                  {pickupOption === "ASAP"
                    ? `ASAP (${currentRestaurant.pickupSettings?.prepTimeMinutes || 15} min)`
                    : scheduledTime}
                </div>

                <div>Settlement Method:</div>
                <div className="text-right font-medium text-emerald-600 font-bold capitalize">
                  {paymentChoice === "online"
                    ? "✅ Paid Online"
                    : "💵 Pay at Counter"}
                </div>
              </div>

              <div className="space-y-1.5 pt-2 border-t border-dashed border-[#E7C7CF] text-[#8C6B76]">
                <div className="flex justify-between text-[11px]">
                  <span>Subtotal:</span>
                  <span>${(placedOrderReceipt?.subtotal ?? 0).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-[11px]">
                  <span>Estimated Taxes ({taxRate}%):</span>
                  <span>${(placedOrderReceipt?.taxes ?? 0).toFixed(2)}</span>
                </div>
                {/* ✅ FIX: Show service fee (defaults to 0) */}
                <div className="flex justify-between text-[11px]">
                  <span>Platform Service Fee:</span>
                  <span>
                    ${(placedOrderReceipt?.serviceFee ?? 0).toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between text-[11px] font-['Baloo_2','Trebuchet_MS',sans-serif] font-bold text-[#33101F] border-t border-[#E7C7CF] pt-1">
                  <span>Final Charged Total:</span>
                  <span>${(placedOrderReceipt?.total ?? 0).toFixed(2)}</span>
                </div>
              </div>

              {placedOrderReceipt?.specialInstructions && (
                <div className="p-2 bg-[#C42348]/5 border border-[#C42348]/10 text-[#33101F] text-[10px] rounded-lg">
                  <span className="block font-bold font-['Inter','Segoe UI',system-ui,sans-serif]">
                    Special Instructions:
                  </span>
                  <p className="italic mt-0.5">
                    "{placedOrderReceipt.specialInstructions}"
                  </p>
                </div>
              )}

              <div className="border-t border-dashed border-[#E7C7CF] pt-2.5">
                <p className="text-[11px] leading-relaxed text-[#8C6B76] text-center font-['Inter','Segoe UI',system-ui,sans-serif]">
                  {paymentChoice === "online"
                    ? "Your payment has been confirmed and your order is being prepared."
                    : "Your order has been received and is being prepared."}
                  <br />
                  <span className="text-xs font-medium text-[#C42348]">
                    Thank you for ordering with {currentRestaurant.name}!
                  </span>
                </p>
              </div>
            </div>

            <div className="flex gap-3 justify-center flex-wrap">
              {/* ✅ FIX: "Order More Food" - stays on same restaurant page */}
              <button
                type="button"
                onClick={() => {
                  setCheckoutStep("menu");
                  setCart([]);
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }}
                className="px-6 py-2.5 bg-[#33101F] hover:bg-[#48182C] text-white rounded-xl font-['Inter','Segoe UI',system-ui,sans-serif] font-semibold text-xs tracking-wide uppercase transition-all cursor-pointer"
              >
                Order More Food
              </button>

              {/* ✅ FIX: "Back to Menu" - goes to the restaurant menu page */}
              <Link
                to={`/restaurant/${currentRestaurant.slug}`}
                className="px-6 py-2.5 bg-[#C42348] hover:bg-[#E84C6B] text-white rounded-xl font-['Inter','Segoe UI',system-ui,sans-serif] font-semibold text-xs tracking-wide uppercase transition-all cursor-pointer flex items-center gap-1.5"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back to Menu</span>
              </Link>
            </div>
          </div>
        )}
      </div>

      {/* Mobile Cart Bottom Sheet - Trigger */}
      {checkoutStep === "menu" && cart.length > 0 && (
        <div className="md:hidden fixed bottom-0 left-0 right-0 z-40">
          {/* Cart bar - tap to open sheet */}
          <div
            onClick={() => setIsCartSheetOpen(true)}
            className="bg-[#C42348] mx-4 mb-4 rounded-2xl p-4 shadow-lg flex items-center justify-between cursor-pointer active:scale-95 transition-transform"
          >
            <div className="flex items-center gap-3">
              <div className="bg-white/20 p-2 rounded-full">
                <ShoppingBag className="w-5 h-5 text-white" />
              </div>
              <div>
                <span className="text-white font-bold text-sm">
                  {itemsInCartCount} items
                </span>
                <span className="text-white/80 text-xs block">
                  Tap to view cart
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-white font-bold text-lg">
                ${finalTotalValue.toFixed(2)}
              </span>
              <ChevronUp className="w-5 h-5 text-white" />
            </div>
          </div>
        </div>
      )}

      {/* MOBILE CART BOTTOM SHEET */}
      <AnimatePresence>
        {isCartSheetOpen && checkoutStep === "menu" && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
            onClick={() => setIsCartSheetOpen(false)}
          >
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="absolute bottom-0 left-0 right-0 bg-white rounded-t-3xl max-h-[85vh] flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Handle Bar */}
              <div className="flex justify-center pt-3 pb-2">
                <div className="w-12 h-1.5 bg-gray-300 rounded-full"></div>
              </div>

              {/* Header */}
              <div className="flex items-center justify-between px-5 pb-4 border-b border-[#E7C7CF]">
                <h3 className="font-['Baloo_2','Trebuchet_MS',sans-serif] text-xl font-bold text-[#33101F]">
                  Your Order
                </h3>
                <button
                  onClick={() => setIsCartSheetOpen(false)}
                  className="text-[#8C6B76] hover:text-[#33101F] p-1"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Cart Items */}
              <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
                {cart.map((item) => (
                  <div
                    key={item.menuItemId}
                    className="flex items-start gap-3 py-3 border-b border-[#E7C7CF] last:border-0"
                  >
                    <div className="w-14 h-14 rounded-lg bg-[#FAF3EA] overflow-hidden flex-shrink-0">
                      <img
                        src={item.image}
                        alt={item.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-['Baloo_2','Trebuchet_MS',sans-serif] font-semibold text-[#33101F] text-sm">
                        {item.name}
                      </h4>
                      <p className="text-[#C42348] font-bold text-sm">
                        ${(item.price * item.quantity).toFixed(2)}
                      </p>
                      {item.specialInstructions && (
                        <p className="text-[10px] text-[#8C6B76] italic truncate">
                          Note: {item.specialInstructions}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex items-center border border-[#E7C7CF] rounded-lg bg-white overflow-hidden">
                        <button
                          onClick={() => updateQuantity(item.menuItemId, -1)}
                          className="px-2 py-1.5 text-[#8C6B76] hover:bg-[#FAF3EA]"
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </button>
                        <span className="px-2 font-mono text-[#33101F] text-sm min-w-[24px] text-center">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() => updateQuantity(item.menuItemId, 1)}
                          className="px-2 py-1.5 text-[#8C6B76] hover:bg-[#FAF3EA]"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <button
                        onClick={() => removeFromCart(item.menuItemId)}
                        className="text-[#8C6B76] hover:text-[#C42348] p-1"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Footer */}
              <div className="border-t border-[#E7C7CF] p-5 space-y-3 bg-white rounded-b-3xl">
                <div className="space-y-1.5 text-xs text-[#8C6B76]">
                  <div className="flex justify-between">
                    <span>Subtotal:</span>
                    <span className="font-medium text-[#33101F]">
                      ${cartTotal.toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Taxes ({taxRate}%):</span>
                    <span className="font-medium text-[#33101F]">
                      ${taxAmountValue.toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Platform Service Fee:</span>
                    <span className="font-medium text-[#33101F]">
                      ${serviceFee.toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between font-['Baloo_2','Trebuchet_MS',sans-serif] font-bold text-[#33101F] text-base pt-1 border-t border-[#E7C7CF]">
                    <span>Total:</span>
                    <span>${finalTotalValue.toFixed(2)}</span>
                  </div>
                </div>

                {currentRestaurant.isOrderingPaused ? (
                  <div className="p-3 bg-[#E8A13B]/10 text-[#E8A13B] font-bold text-[10px] text-center uppercase rounded-lg border border-[#E8A13B]/20">
                    Ordering paused by {currentRestaurant.name}
                  </div>
                ) : (
                  <button
                    onClick={() => {
                      setIsCartSheetOpen(false);
                      setCheckoutStep("checkout");
                    }}
                    className="w-full bg-[#C42348] hover:bg-[#E84C6B] text-white font-bold py-3.5 rounded-xl transition-all text-sm"
                  >
                    Proceed to Checkout
                  </button>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* MOBILE ITEM DETAIL BOTTOM SHEET */}
      <AnimatePresence>
        {isItemSheetOpen && selectedItem && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
            onClick={() => setIsItemSheetOpen(false)}
          >
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="absolute bottom-0 left-0 right-0 bg-white rounded-t-3xl max-h-[90vh] flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Handle Bar */}
              <div className="flex justify-center pt-3 pb-2">
                <div className="w-12 h-1.5 bg-gray-300 rounded-full"></div>
              </div>

              {/* Close Button */}
              <div className="flex justify-end px-4">
                <button
                  onClick={() => setIsItemSheetOpen(false)}
                  className="text-[#8C6B76] hover:text-[#33101F] p-1"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Content */}
              <div className="flex-1 overflow-y-auto px-5 pb-4">
                {/* Image */}
                <div className="w-full h-56 rounded-xl bg-[#FAF3EA] overflow-hidden mb-4">
                  <img
                    src={selectedItem.image}
                    alt={selectedItem.name}
                    className="w-full h-full object-cover"
                  />
                </div>

                {/* Name & Price */}
                <div className="flex justify-between items-start mb-2">
                  <h3 className="text-xl font-['Baloo_2','Trebuchet_MS',sans-serif] font-bold text-[#33101F]">
                    {selectedItem.name}
                  </h3>
                  <span className="text-xl font-['Baloo_2','Trebuchet_MS',sans-serif] font-bold text-[#C42348]">
                    ${(selectedItem.price * itemQuantity).toFixed(2)}
                  </span>
                </div>

                {/* Description */}
                <p className="text-sm text-[#8C6B76] leading-relaxed mb-4">
                  {selectedItem.description}
                </p>

                {/* Special Instructions */}
                <div className="mb-3">
                  <label className="block text-xs font-semibold text-[#33101F] mb-1.5 font-['Inter','Segoe UI',system-ui,sans-serif]">
                    Special Instructions
                  </label>
                  <textarea
                    value={itemSpecialInstructions}
                    onChange={(e) => setItemSpecialInstructions(e.target.value)}
                    placeholder="Add a note (e.g. no nuts, no onions)"
                    rows={2}
                    className="w-full px-3.5 py-2 border border-[#E7C7CF] rounded-xl text-xs text-[#33101F] focus:outline-none focus:ring-2 focus:ring-[#C42348] font-['Inter','Segoe UI',system-ui,sans-serif] text-base md:text-xs"
                  />
                  <p className="text-[10px] text-[#8C6B76] mt-1 font-['Inter','Segoe UI',system-ui,sans-serif]">
                    No substitutes. Additions may be charged extra.
                  </p>
                </div>

                {/* Quantity Stepper */}
                <div className="flex items-center justify-between mb-4">
                  <span className="text-sm font-medium text-[#33101F] font-['Inter','Segoe UI',system-ui,sans-serif]">
                    Quantity
                  </span>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() =>
                        setItemQuantity((prev) => Math.max(1, prev - 1))
                      }
                      disabled={itemQuantity <= 1}
                      className={`w-8 h-8 rounded-full border flex items-center justify-center transition-all ${
                        itemQuantity <= 1
                          ? "border-gray-200 text-gray-300 cursor-not-allowed"
                          : "border-[#E7C7CF] text-[#33101F] hover:bg-[#FAF3EA]"
                      }`}
                    >
                      <Minus className="w-4 h-4" />
                    </button>
                    <span className="font-mono text-lg font-bold text-[#33101F] min-w-[32px] text-center">
                      {itemQuantity}
                    </span>
                    <button
                      onClick={() => setItemQuantity((prev) => prev + 1)}
                      className="w-8 h-8 rounded-full border border-[#E7C7CF] text-[#33101F] hover:bg-[#FAF3EA] flex items-center justify-center transition-all"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Add to Cart Button */}
                <button
                  onClick={handleAddFromSheet}
                  className="w-full bg-[#C42348] hover:bg-[#E84C6B] text-white font-bold py-3.5 rounded-xl transition-all text-sm flex items-center justify-between px-5"
                >
                  <span>Add to Cart</span>
                  <span>${(selectedItem.price * itemQuantity).toFixed(2)}</span>
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
