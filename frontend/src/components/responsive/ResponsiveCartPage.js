import CartPage from '../../pages/CartPage';
import MobileCartPage from '../../pages/MobileCartPage';
import createResponsivePage from '../../utils/createResponsivePage';

// Verwendung der Factory-Funktion für Code-Reduktion
const ResponsiveCartPage = createResponsivePage(CartPage, MobileCartPage);

export default ResponsiveCartPage;