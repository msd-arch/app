# Identra Care Vision — Parent Mobile App

Official React Native / Expo parent mobile application for the **IDENTRA Care Vision** AI-based child safety monitoring system (Final Year Project — Air University, Islamabad).

This app allows parents/guardians to monitor their child's safety, view real-time location/status inside the facility, receive high-priority safety zone violation alerts, inspect attendance history (drop-off and pickup times), review monthly fees, and manage notification preferences.

---

## 📱 Tech Stack & Libraries

- **Framework**: [React Native](https://reactnative.dev/) `0.76.9` with [Expo SDK](https://expo.dev/) `~52.0.0`
- **Routing & Navigation**: [Expo Router](https://docs.expo.dev/router/introduction/) `~4.0.17` (File-based routing with tab and stack navigators)
- **State Management**: [Zustand](https://github.com/pmndrs/zustand) `^5.0.12`
- **Networking**: [Axios](https://axios-http.com/) `^1.13.6` with request/response JWT interceptors
- **Language**: [TypeScript](https://www.typescriptlang.org/) `~5.9.2`
- **UI & Icons**:
  - `@expo/vector-icons` (`Ionicons`)
  - `expo-linear-gradient`
  - `react-native-safe-area-context`
  - `react-native-screens`
  - Custom Inter font family (`Inter-Regular`, `Inter-SemiBold`, `Inter-Bold`)
- **Visualizations & Charts**: `react-native-chart-kit` and `react-native-svg`
- **Push Notifications & Hardware**:
  - `expo-notifications` (configured with `google-services.json` for Android)
  - `expo-haptics`
  - `@react-native-community/netinfo` (offline detection)
  - `@react-native-async-storage/async-storage`

---

## 🛠️ Work Completed & Implemented Features

### 1. Navigation & App Shell
- **File-based Routing**: Structured using `expo-router` with typed routes.
- **Top-level Layout & Providers** (`app/_layout.tsx`):
  - Global `ErrorBoundary` to gracefully recover from render crashes with a "Reload App" option.
  - Safe area provider and splash screen management (`expo-splash-screen`).
  - Global offline detection banner (`OfflineBanner`) when internet connection drops.
  - In-app toast banner (`NotificationBanner`) for real-time alerts.
- **Tab Navigator** (`app/(tabs)/_layout.tsx`):
  - Bottom navigation bar with 4 tabs: **Home**, **Attendance**, **Alerts**, and **Fees**.
  * Real-time unread count indicator (red badge) on the Alerts tab.

### 2. Authentication Flow (`app/(auth)/`)
- **Login Screen** (`app/(auth)/login.tsx` & `app/(auth)/index.tsx`):
  - Email and password authentication with form validation.
  - Error state display and loading spinners.
  - Parent account verification.
- **Auth Store** (`store/authStore.ts`):
  - Persistent storage of JWT access and refresh tokens.
  - Automatic injection of Bearer token into outbound Axios requests.
  - Single-flight 401 handling: automatically clears auth and redirects to login when tokens expire.

### 3. Core Screens & Views
- **Home / Dashboard** (`app/(tabs)/index.tsx`):
  - Personalized greeting with parent's name.
  - **Child Status Cards** (`ChildCard`): Shows child name, code, RFID tag ID, live status badge (`Inside`, `Outside`, or `Unknown`), and last-seen timestamp.
  - **Recent Notifications Preview**: Shows the 3 latest alerts with quick-tap navigation.
  * **Fee Summary Card** (`FeeCard`): At-a-glance view of outstanding or upcoming monthly fee obligations.
  - Pull-to-refresh to fetch updated statuses from the backend.
- **Alerts & Notifications** (`app/(tabs)/alerts.tsx`):
  - Categorized feed of notifications:
    - ⚠️ **Zone Violations** (high priority: child detected entering restricted areas)
    - 🧒 **Drop-off Confirmations** (RFID gate scan verification)
    - ⏰ **Pickup Reminders**
    - ℹ️ **General Announcements**
  - Mark-as-read tracking and filter by notification type.
- **Attendance** (`app/(tabs)/attendance.tsx`):
  - Day-by-day attendance history (`AttendanceDayRow`).
  - Drop-off time, pickup time, and present/absent status indicators.
  - Month and date range filters with attendance summary stats.
- **Fees & Billing** (`app/(tabs)/fees.tsx`):
  - Overview of invoices (`FeeListItem`): Pending, Paid, and Overdue statuses.
  - Detailed fee amount, due date, and receipt link.
- **Child Detail & Profile** (`app/child/[childId].tsx`):
  - Deep-dive into a specific child's profile, RFID band ID, registration details, and emergency contacts.
- **Child Safety Analytics** (`app/analytics/[childId].tsx`):
  - Interactive charts (`react-native-chart-kit`) displaying attendance trends and zone violation frequency.
- **Payment Checkout Flow** (`app/payment/[feeId].tsx`):
  - Integrated payment screen for outstanding fees supporting card and mobile payment flows.
- **Settings & Profile** (`app/settings.tsx`):
  - Parent profile details.
  - Notification preference toggles (Zone violation alerts are locked ON for safety).
  - One-tap sign out.

### 4. API & Data Layer (`api/`)
Modularized API services communicating with the backend REST endpoints:
- `client.ts`: Base Axios instance with automatic JWT authorization header attachment and 401 handling.
- `auth.ts`: Login, logout, device token registration, and profile retrieval (`/auth/me`).
- `child.ts`: Fetch children linked to the authenticated parent and retrieve live tracking status.
- `attendance.ts`: Fetch attendance records and daily session logs.
- `notifications.ts`: Fetch notification feed and update read status.
- `fees.ts`: Fetch invoices, fee breakdown, and transaction status.
- `analytics.ts`: Attendance percentage, movement frequency, and safety metrics.

### 5. Shared Components (`components/`)
- `AppHeader`: Consistent top navigation bar with profile and settings links.
- `ChildCard`: Status card for child monitoring.
- `StatusBadge`: Color-coded pill (`Inside` = green, `Alert` = red, `Picked up` = blue).
- `FeeCard` & `FeeListItem`: Billing card components.
- `NotificationRow` & `NotificationBanner`: Alert rows and in-app banners.
- `AttendanceDayRow`: Individual calendar day log.
- `OfflineBanner`: In-app notification when device network is disconnected.
- `SkeletonBox`: Shimmer loading state placeholder.
- `PrimaryButton`: Styled touchable button with loading state.

---

## 📂 Project Structure

```
identra-parent-app/
├── api/                   # Backend REST API service modules
│   ├── analytics.ts
│   ├── attendance.ts
│   ├── auth.ts
│   ├── child.ts
│   ├── client.ts         # Axios instance with JWT interceptor
│   ├── fees.ts
│   └── notifications.ts
├── app/                   # Expo Router file-based pages
│   ├── _layout.tsx        # Root layout with ErrorBoundary & Providers
│   ├── settings.tsx       # Parent settings & notification preferences
│   ├── (auth)/            # Authentication stack
│   │   ├── _layout.tsx
│   │   ├── index.tsx
│   │   └── login.tsx
│   ├── (tabs)/            # Main bottom tabs
│   │   ├── _layout.tsx
│   │   ├── alerts.tsx     # Safety alerts & notification list
│   │   ├── attendance.tsx # Drop-off & pickup logs
│   │   ├── fees.tsx       # Fee invoices & payment
│   │   └── index.tsx      # Home dashboard & child status
│   ├── analytics/
│   │   └── [childId].tsx  # Safety & attendance charts
│   ├── child/
│   │   └── [childId].tsx  # Child detail view
│   └── payment/
│       └── [feeId].tsx    # Checkout & payment handling
├── assets/                # Icons, splash images, and Inter fonts
│   └── fonts/
├── components/            # Reusable UI widgets
├── constants/             # Theme colors & typography definitions
├── hooks/                 # Custom React hooks (useChild, useNotifications)
├── store/                 # Zustand stores (authStore, notificationStore)
├── types/                 # TypeScript interfaces for all domain models
├── utils/                 # Date/time formatters and attendance utilities
├── .env.example           # Environment variable template
├── app.json               # Expo configuration & plugins
├── google-services.json   # Android Firebase Cloud Messaging configuration
└── package.json           # Dependencies and scripts
```

---

## 🚀 Getting Started

### Prerequisites
- Node.js (v18 or v20 recommended)
- [Expo Go](https://expo.dev/go) app installed on your physical mobile device (Android or iOS)

### Installation
1. Clone the repository:
   ```bash
   git clone https://github.com/msd-arch/app.git
   cd app
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Set up environment variables:
   Create a `.env` file from the example:
   ```bash
   cp .env.example .env
   ```
   Configure `EXPO_PUBLIC_API_URL` to point to your running Identra Django backend (e.g., `http://192.168.1.X:8000/api/v1` when testing on a physical phone via Wi-Fi).

### Running the App
Start the Expo Metro bundler:
```bash
npx expo start
```
- Scan the QR code displayed in the terminal using the **Expo Go** app on Android or the Camera app on iOS.
- Press `a` in the terminal to launch in an Android Emulator.
- Press `i` to launch in the iOS Simulator.
