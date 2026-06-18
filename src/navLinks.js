// Shared role-based navigation items, used by the desktop sidebar and mobile bottom bar.
export const ROLE_LINKS = {
  dentist: [
    { to: "/dentist", icon: "dashboard", label: "Dashboard" },
    { to: "/clients", icon: "group", label: "Clients" },
    { to: "/appointments", icon: "calendar_month", label: "Appointments" },
    { to: "/finances", icon: "payments", label: "Finances" },
    { to: "/supplies", icon: "shopping_cart", label: "Supplies" },
    { to: "/expenses", icon: "receipt_long", label: "Expenses" },
  ],
  client: [
    { to: "/client", icon: "dashboard", label: "Dashboard" },
    { to: "/find-dentist", icon: "person_search", label: "Find a dentist" },
  ],
  vendor: [{ to: "/vendor", icon: "storefront", label: "My Store" }],
};
