import 'package:flutter/material';
import 'package:go_router/go_router.dart';
import '../../core/theme/medical_theme.dart';

class PassportScreen extends StatelessWidget {
  const PassportScreen({super.key});

  @override
  Widget build(BuildContext context) {
    // Simulated passport version logs
    final List<Map<String, dynamic>> versions = [
      {
        'version': 2,
        'date': 'July 09, 2026',
        'score': 82,
        'pain': 4,
        'summary': 'Wound inflammation is reducing. Adherence to physical joint exercises is 90%. Pain level has normalized to moderate.',
        'med': 'Celecoxib 200mg daily check'
      },
      {
        'version': 1,
        'date': 'July 06, 2026',
        'score': 74,
        'pain': 7,
        'summary': 'Discharge baseline created. Initial joint flexion of 65 degrees. High swelling reported around surgical incision.',
        'med': 'Paracetamol 1g QDS, Celecoxib 200mg'
      }
    ];

    return Scaffold(
      appBar: AppBar(
        title: const Text('Recovery Passport™ History', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_rounded),
          onPressed: () => context.go('/'),
        ),
      ),
      body: ListView.builder(
        padding: const EdgeInsets.all(16.0),
        itemCount: versions.length,
        itemBuilder: (context, index) {
          final ver = versions[index];
          return Card(
            margin: const EdgeInsets.bottom(16.0),
            child: Padding(
              padding: const EdgeInsets.all(16.0),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.between,
                    children: [
                      Row(
                        children: [
                          CircleAvatar(
                            radius: 12,
                            backgroundColor: MedicalTheme.primaryBlue.withOpacity(0.1),
                            child: Text(
                              'v${ver['version']}',
                              style: const TextStyle(color: MedicalTheme.primaryBlue, fontSize: 11, fontWeight: FontWeight.bold),
                            ),
                          ),
                          const SizedBox(width: 8),
                          Text(
                            ver['date'],
                            style: const TextStyle(color: Colors.grey, fontSize: 12),
                          ),
                        ],
                      ),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 10, py: 4),
                        decoration: BoxDecoration(
                          color: MedicalTheme.successGreen.withOpacity(0.1),
                          borderRadius: BorderRadius.circular(12),
                        ),
                        child: Text(
                          'Score: ${ver['score']}%',
                          style: const TextStyle(color: MedicalTheme.successGreen, fontSize: 11, fontWeight: FontWeight.bold),
                        ),
                      ),
                    ],
                  ),
                  const Divider(height: 24, color: Colors.black12),
                  const Text(
                    'AI Recovery Summary',
                    style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: MedicalTheme.primaryBlue),
                  ),
                  const SizedBox(height: 6),
                  Text(
                    ver['summary'],
                    style: const TextStyle(fontSize: 12, height: 1.4),
                  ),
                  const SizedBox(height: 16),
                  Row(
                    children: [
                      const Icon(Icons.medical_services_outlined, size: 16, color: Colors.grey),
                      const SizedBox(width: 4),
                      Expanded(
                        child: Text(
                          ver['med'],
                          style: const TextStyle(fontSize: 11, color: Colors.grey),
                        ),
                      ),
                      const Icon(Icons.health_and_safety_outlined, size: 16, color: Colors.grey),
                      const SizedBox(width: 4),
                      Text(
                        'Pain: ${ver['pain']}/10',
                        style: const TextStyle(fontSize: 11, color: Colors.grey),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          );
        },
      ),
    );
  }
}
