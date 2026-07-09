import 'package:flutter/material';
import 'package:google_fonts/google_fonts.dart';

class MedicalTheme {
  static const Color primaryBlue = Color(0xff2563eb);
  static const Color successGreen = Color(0xff16a34a);
  static const Color warningOrange = Color(0xfff59e0b);
  static const Color errorRed = Color(0xffdc2626);
  
  static const Color lightBg = Color(0xfff8fafc);
  static const Color darkBg = Color(0xff090d16);
  static const Color darkCard = Color(0xff111827);

  static ThemeData get lightTheme {
    return ThemeData(
      useMaterial3: true,
      brightness: Brightness.light,
      primaryColor: primaryBlue,
      scaffoldBackgroundColor: lightBg,
      cardColor: Colors.white,
      textTheme: GoogleFonts.interTextTheme(ThemeData.light().textTheme),
      colorScheme: const ColorScheme.light(
        primary: primaryBlue,
        secondary: Color(0xffe2e8f0),
        error: errorRed,
        surface: Colors.white,
      ),
      cardTheme: CardTheme(
        color: Colors.white,
        elevation: 1,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      ),
    );
  }

  static ThemeData get darkTheme {
    return ThemeData(
      useMaterial3: true,
      brightness: Brightness.dark,
      primaryColor: primaryBlue,
      scaffoldBackgroundColor: darkBg,
      cardColor: darkCard,
      textTheme: GoogleFonts.interTextTheme(ThemeData.dark().textTheme),
      colorScheme: const ColorScheme.dark(
        primary: primaryBlue,
        secondary: Color(0xff1f2937),
        error: errorRed,
        surface: darkCard,
      ),
      cardTheme: CardTheme(
        color: darkCard,
        elevation: 2,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      ),
    );
  }
}
