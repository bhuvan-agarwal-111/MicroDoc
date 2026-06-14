/**
 * MicroDoc — App Shell
 *
 * Tab-based navigation between Journal (Dashboard) and Report views.
 */

import { Redirect, Route } from 'react-router-dom';
import {
  IonApp,
  IonIcon,
  IonLabel,
  IonRouterOutlet,
  IonTabBar,
  IonTabButton,
  IonTabs,
  setupIonicReact,
} from '@ionic/react';
import { IonReactRouter } from '@ionic/react-router';
import { listOutline, documentTextOutline } from 'ionicons/icons';

import Dashboard from './pages/Dashboard';
import ReportView from './pages/ReportView';

/* Core CSS required for Ionic components to work properly */
import '@ionic/react/css/core.css';

/* Basic CSS for apps built with Ionic */
import '@ionic/react/css/normalize.css';
import '@ionic/react/css/structure.css';
import '@ionic/react/css/typography.css';

/* Optional CSS utils */
import '@ionic/react/css/padding.css';
import '@ionic/react/css/float-elements.css';
import '@ionic/react/css/text-alignment.css';
import '@ionic/react/css/text-transformation.css';
import '@ionic/react/css/flex-utils.css';
import '@ionic/react/css/display.css';

/**
 * Ionic Dark Mode
 * We use system-preference based dark mode detection.
 * The app defaults to light mode — dark mode auto-activates
 * only if the user's OS is set to dark.
 */
/* Dark mode disabled — app is forced light mode on all devices */
// import '@ionic/react/css/palettes/dark.system.css';

/* Theme variables */
import './theme/variables.css';

setupIonicReact();

const App: React.FC = () => (
  <IonApp>
    <IonReactRouter>
      <IonTabs>
        <IonRouterOutlet>
          <Route exact path="/journal">
            <Dashboard />
          </Route>
          <Route exact path="/report">
            <ReportView />
          </Route>
          <Route exact path="/">
            <Redirect to="/journal" />
          </Route>
        </IonRouterOutlet>

        <IonTabBar slot="bottom">
          <IonTabButton tab="journal" href="/journal">
            <IonIcon icon={listOutline} />
            <IonLabel>Journal</IonLabel>
          </IonTabButton>
          <IonTabButton tab="report" href="/report">
            <IonIcon icon={documentTextOutline} />
            <IonLabel>Report</IonLabel>
          </IonTabButton>
        </IonTabBar>
      </IonTabs>
    </IonReactRouter>
  </IonApp>
);

export default App;
