import 'package:flutter/material';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:google_fonts/google_fonts.dart';

import 'core/theme/medical_theme.dart';
import 'features/auth/login_screen.dart';
import 'features/auth/register_screen.dart';
import 'features/dashboard/home_screen.dart';
import 'features/passport/passport_screen.dart';
import 'features/replay/replay_screen.dart';
import 'features/twin/twin_screen.dart';
import 'features/profile/profile_screen.dart';

void main() {
  WidgetsFlutterBinding.ensureInitialized();
  runApp(
    const ProviderScope(
      child: SurgiSenseApp(),
    ),
  );
}

final GoRouter _router = GoRouter(
  initialLocation: '/login',
  routes: <RouteBase>[
    GoRoute(
      path: '/login',
      builder: (BuildContext context, GoRouterState state) => const LoginScreen(),
    ),
    GoRoute(
      path: '/register',
      builder: (BuildContext context, GoRouterState state) => const RegisterScreen(),
    ),
    GoRoute(
      path: '/',
      builder: (BuildContext context, GoRouterState state) => const HomeScreen(),
    ),
    GoRoute(
      path: '/passport',
      builder: (BuildContext context, GoRouterState state) => const PassportScreen(),
    ),
    GoRoute(
      path: '/replay',
      builder: (BuildContext context, GoRouterState state) => const ReplayScreen(),
    ),
    GoRoute(
      path: '/twin',
      builder: (BuildContext context, GoRouterState state) => const TwinScreen(),
    ),
    GoRoute(
      path: '/profile',
      builder: (BuildContext context, GoRouterState state) => const ProfileScreen(),
    ),
  ],
);

class SurgiSenseApp extends StatelessWidget {
  const SurgiSenseApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp.router(
      title: 'SurgiSense AI',
      themeMode: ThemeMode.system,
      theme: MedicalTheme.lightTheme,
      darkTheme: MedicalTheme.darkTheme,
      routerConfig: _router,
      debugShowCheckedModeBanner: false,
    );
  }
}
