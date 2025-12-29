import SmartProfilePage from '../../pages/SmartProfilePage';
import AccordionProfilePage from '../../pages/AccordionProfilePage';
import createResponsivePage from '../../utils/createResponsivePage';

// Verwendung der Factory-Funktion für Code-Reduktion
const ResponsiveProfilePage = createResponsivePage(SmartProfilePage, AccordionProfilePage);

export default ResponsiveProfilePage;