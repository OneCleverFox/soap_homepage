import CartPage from '../../pages/CartPage';
import MobileCartPage from '../../pages/MobileCartPage';
import CheckoutPage from '../../pages/CheckoutPage';
import MobileCheckoutPage from '../../pages/MobileCheckoutPage';
import SmartProfilePage from '../../pages/SmartProfilePage';
import AccordionProfilePage from '../../pages/AccordionProfilePage';
import createResponsivePage from '../../utils/createResponsivePage';

// Konsolidierte Responsive Pages mit Factory Pattern
export const ResponsiveCartPage = createResponsivePage(CartPage, MobileCartPage);
export const ResponsiveCheckoutPage = createResponsivePage(CheckoutPage, MobileCheckoutPage);
export const ResponsiveProfilePage = createResponsivePage(SmartProfilePage, AccordionProfilePage);

// Default exports für Backward Compatibility
export default ResponsiveCartPage;