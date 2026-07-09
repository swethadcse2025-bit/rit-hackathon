import 'package:flutter/material';
import 'package:go_router/go_router.dart';
import '../../core/theme/medical_theme.dart';

class TwinScreen extends StatelessWidget {
  const TwinScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Digital Recovery Twin™', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_rounded),
          onPressed: () => context.go('/'),
        ),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(20.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            // Target Baseline Curves
            Card(
              child: Padding(
                padding: const EdgeInsets.all(16.0),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text(
                      'Baseline Trajectory Curve',
                      style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14),
                    ),
                    const SizedBox(height: 4),
                    const Text(
                      'AI projections vs. actual recovery logs',
                      style: TextStyle(fontSize: 11, color: Colors.grey),
                    ),
                    const SizedBox(height: 24),
                    
                    // Simple custom drawing representing graph lines
                    Container(
                      height: 180,
                      decoration: BoxDecoration(
                        color: Colors.grey[50],
                        borderRadius: BorderRadius.circular(8),
                        border: Border.all(color: Colors.black12),
                      ),
                      padding: const EdgeInsets.all(16),
                      child: CustomPaint(
                        painter: CurvePainter(),
                      ),
                    ),
                    const SizedBox(height: 16),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        _buildLegendItem('Expected baseline', Colors.grey, isDashed: true),
                        const SizedBox(width: 24),
                        _buildLegendItem('Actual progress', MedicalTheme.primaryBlue),
                      ],
                    ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 20),

            // Analytics metadata cards
            Card(
              child: Padding(
                padding: const EdgeInsets.all(16.0),
                child: Column(
                  children: [
                    _buildForecastTile(
                      'Estimated Complete Healing',
                      'August 04, 2026',
                      Icons.event_available_rounded,
                    ),
                    const Divider(height: 24),
                    _buildForecastTile(
                      'Twin Synchronization',
                      '94% Confidence Rate',
                      Icons.sync_saved_locally_rounded,
                    ),
                    const Divider(height: 24),
                    _buildForecastTile(
                      'Incision Healing Health',
                      'On schedule (+2.1% score deviation)',
                      Icons.favorite_outline_rounded,
                    ),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildLegendItem(String title, Color color, {bool isDashed = false}) {
    return Row(
      children: [
        Container(
          width: 20,
          height: 3,
          decoration: BoxDecoration(
            color: isDashed ? null : color,
            borderRadius: BorderRadius.circular(2),
          ),
          child: isDashed
              ? Row(
                  children: List.generate(
                    3,
                    (index) => Expanded(
                      child: Container(
                        margin: const EdgeInsets.symmetric(horizontal: 1),
                        color: color,
                      ),
                    ),
                  ),
                )
              : null,
        ),
        const SizedBox(width: 6),
        Text(title, style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w600)),
      ],
    );
  }

  Widget _buildForecastTile(String title, String subtitle, IconData icon) {
    return Row(
      children: [
        Icon(icon, color: MedicalTheme.primaryBlue, size: 24),
        const SizedBox(width: 16),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(title, style: const TextStyle(fontSize: 11, color: Colors.grey, fontWeight: FontWeight.bold)),
              const SizedBox(height: 2),
              Text(subtitle, style: const TextStyle(fontSize: 14, fontWeight: FontWeight.bold)),
            ],
          ),
        ),
      ],
    );
  }
}

class CurvePainter extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    final expectedPaint = Paint()
      ..color = Colors.grey
      ..strokeWidth = 2
      ..style = PaintingStyle.stroke;

    final actualPaint = Paint()
      ..color = MedicalTheme.primaryBlue
      ..strokeWidth = 3
      ..style = PaintingStyle.stroke;

    final dotPaint = Paint()
      ..color = MedicalTheme.primaryBlue
      ..style = PaintingStyle.fill;

    // Draw expected sigmoidal curve baseline
    final expectedPath = Path();
    expectedPath.moveTo(0, size.height * 0.85);
    expectedPath.cubicTo(
      size.width * 0.35,
      size.height * 0.85,
      size.width * 0.65,
      size.height * 0.15,
      size.width,
      size.height * 0.15,
    );
    canvas.drawPath(expectedPath, expectedPaint);

    // Draw actual trajectory progress curve (partially completed)
    final actualPath = Path();
    actualPath.moveTo(0, size.height * 0.85);
    actualPath.cubicTo(
      size.width * 0.25,
      size.height * 0.85,
      size.width * 0.45,
      size.height * 0.55,
      size.width * 0.65,
      size.height * 0.45,
    );
    canvas.drawPath(actualPath, actualPaint);

    // Draw terminal milestone dot
    canvas.drawCircle(Offset(size.width * 0.65, size.height * 0.45), 5, dotPaint);
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}
