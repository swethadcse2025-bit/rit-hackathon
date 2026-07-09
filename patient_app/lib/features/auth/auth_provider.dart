import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../../core/api/api_client.dart';

class AuthState {
  final bool isAuthenticated;
  final bool isLoading;
  final String? errorMessage;
  final String? email;
  final String? role;

  AuthState({
    this.isAuthenticated = false,
    this.isLoading = false,
    this.errorMessage,
    this.email,
    this.role,
  });

  AuthState copyWith({
    bool? isAuthenticated,
    bool? isLoading,
    String? errorMessage,
    String? email,
    String? role,
  }) {
    return AuthState(
      isAuthenticated: isAuthenticated ?? this.isAuthenticated,
      isLoading: isLoading ?? this.isLoading,
      errorMessage: errorMessage,
      email: email ?? this.email,
      role: role ?? this.role,
    );
  }
}

class AuthNotifier extends StateNotifier<AuthState> {
  final ApiClient _apiClient = ApiClient();

  AuthNotifier() : super(AuthState()) {
    _checkSavedAuth();
  }

  Future<void> _checkSavedAuth() async {
    state = state.copyWith(isLoading: true);
    final prefs = await SharedPreferences.getInstance();
    final token = prefs.getString('accessToken');
    final email = prefs.getString('email');
    final role = prefs.getString('role');

    if (token != null) {
      state = AuthState(
        isAuthenticated: true,
        email: email,
        role: role,
      );
    } else {
      state = AuthState(isAuthenticated: false);
    }
  }

  Future<bool> login(String email, String password) async {
    state = state.copyWith(isLoading: true, errorMessage: null);
    try {
      final res = await _apiClient.dio.post('/auth/login', data: {
        'email': email,
        'password': password,
      });

      final accessToken = res.data['accessToken'];
      final refreshToken = res.data['refreshToken'];
      final userRole = res.data['role'];

      final prefs = await SharedPreferences.getInstance();
      await prefs.setString('accessToken', accessToken);
      await prefs.setString('refreshToken', refreshToken);
      await prefs.setString('email', email);
      await prefs.setString('role', userRole);

      state = AuthState(
        isAuthenticated: true,
        email: email,
        role: userRole,
      );
      return true;
    } catch (e) {
      state = state.copyWith(
        isLoading: false,
        errorMessage: 'Invalid username or password. Please verify credentials.',
      );
      return false;
    }
  }

  Future<bool> register({
    required String email,
    required String password,
    required String name,
    required String procedure,
  }) async {
    state = state.copyWith(isLoading: true, errorMessage: null);
    try {
      final res = await _apiClient.dio.post('/auth/register', data: {
        'email': email,
        'password': password,
        'role': 'PATIENT',
        'name': name,
        'procedure': procedure,
        'consentGranted': true,
        'consentType': 'CLINICAL_DATA_USE',
      });

      final accessToken = res.data['accessToken'];
      final refreshToken = res.data['refreshToken'];
      final userRole = res.data['role'];

      final prefs = await SharedPreferences.getInstance();
      await prefs.setString('accessToken', accessToken);
      await prefs.setString('refreshToken', refreshToken);
      await prefs.setString('email', email);
      await prefs.setString('role', userRole);

      state = AuthState(
        isAuthenticated: true,
        email: email,
        role: userRole,
      );
      return true;
    } catch (e) {
      state = state.copyWith(
        isLoading: false,
        errorMessage: 'Registration failed. Email might be in use.',
      );
      return false;
    }
  }

  Future<void> logout() async {
    state = state.copyWith(isLoading: true);
    try {
      await _apiClient.dio.post('/auth/logout');
    } catch (_) {}
    final prefs = await SharedPreferences.getInstance();
    await prefs.clear();
    state = AuthState(isAuthenticated: false);
  }
}

final authProvider = StateNotifierProvider<AuthNotifier, AuthState>((ref) {
  return AuthNotifier();
});
