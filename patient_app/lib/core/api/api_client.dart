import 'package:dio/dio.dart';
import 'package:shared_preferences/shared_preferences.dart';

class ApiClient {
  static final ApiClient _instance = ApiClient._internal();
  factory ApiClient() => _instance;

  late final Dio dio;
  final String baseUrl = "http://localhost:5000/api/v1";

  ApiClient._internal() {
    dio = Dio(BaseOptions(
      baseUrl: baseUrl,
      connectTimeout: const Duration(seconds: 10),
      receiveTimeout: const Duration(seconds: 10),
      headers: {
        'Content-Type': 'application/json',
      },
    ));

    // Request interceptor to attach JWT token
    dio.interceptors.add(
      InterceptorsWrapper(
        onRequest: (options, handler) async {
          final prefs = await SharedPreferences.getInstance();
          final token = prefs.getString('accessToken');
          if (token != null) {
            options.headers['Authorization'] = 'Bearer $token';
          }
          return handler.next(options);
        },
        onError: (DioException error, handler) async {
          if (error.response?.statusCode == 401) {
            final prefs = await SharedPreferences.getInstance();
            final refreshToken = prefs.getString('refreshToken');
            if (refreshToken != null) {
              try {
                // Fetch refreshed token
                final tokenDio = Dio(BaseOptions(baseUrl: baseUrl));
                final res = await tokenDio.post('/auth/refresh', data: {
                  'refreshToken': refreshToken,
                });
                
                final newAccessToken = res.data['accessToken'];
                await prefs.setString('accessToken', newAccessToken);

                // Retry original request
                final options = error.requestOptions;
                options.headers['Authorization'] = 'Bearer $newAccessToken';
                final retryRes = await dio.fetch(options);
                return handler.resolve(retryRes);
              } catch (e) {
                // Logout on refresh error
                await prefs.clear();
              }
            }
          }
          return handler.next(error);
        },
      ),
    );
  }
}
