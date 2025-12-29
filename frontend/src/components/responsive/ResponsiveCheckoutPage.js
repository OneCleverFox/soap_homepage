import CheckoutPage from '../../pages/CheckoutPage';
import MobileCheckoutPage from '../../pages/MobileCheckoutPage';
import createResponsivePage from '../../utils/createResponsivePage';

// Verwendung der Factory-Funktion für Code-Reduktion
const ResponsiveCheckoutPage = createResponsivePage(CheckoutPage, MobileCheckoutPage);

export default ResponsiveCheckoutPage;