// Test script to check which screen imports are undefined
import ParentSignupScreen from './screens/ParentSignupScreen';
import ParentLoginScreen from './screens/ParentLoginScreen';
import ParentDashboardScreen from './screens/ParentDashboardScreen';
import EventManagementScreen from './screens/EventManagementScreen';
import GiftManagementScreen from './screens/GiftManagementScreen';
import ManageChildrenScreen from './screens/ManageChildrenScreen';
import GuestManagementScreen from './screens/GuestManagementScreen';
import ParentVideoReviewScreen from './screens/ParentVideoReviewScreen';
import SendToGuestsScreen from './screens/SendToGuestsScreen';
import SendSuccessScreen from './screens/SendSuccessScreen';
import KidPINLoginScreen from './screens/KidPINLoginScreen';
import KidPendingGiftsScreen from './screens/KidPendingGiftsScreen';
import { VideoRecordingScreen } from './screens/VideoRecordingScreen';
import VideoPlaybackScreen from './screens/VideoPlaybackScreen';
import MusicSelectionScreen from './screens/MusicSelectionScreen';
import VideoCustomizationScreen from './screens/VideoCustomizationScreen';
import VideoConfirmationScreen from './screens/VideoConfirmationScreen';
import VideoSuccessScreen from './screens/VideoSuccessScreen';

const screens = {
  ParentSignupScreen,
  ParentLoginScreen,
  ParentDashboardScreen,
  EventManagementScreen,
  GiftManagementScreen,
  ManageChildrenScreen,
  GuestManagementScreen,
  ParentVideoReviewScreen,
  SendToGuestsScreen,
  SendSuccessScreen,
  KidPINLoginScreen,
  KidPendingGiftsScreen,
  VideoRecordingScreen,
  VideoPlaybackScreen,
  MusicSelectionScreen,
  VideoCustomizationScreen,
  VideoConfirmationScreen,
  VideoSuccessScreen,
};

Object.entries(screens).forEach(([name, component]) => {
  if (component === undefined) {
    console.error(`❌ ${name} is UNDEFINED`);
  } else {
    console.log(`✅ ${name} is defined`);
  }
});
