import 'package:flutter/material';
import 'package:go_router/go_router.dart';
import '../../core/theme/medical_theme.dart';

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  int _currentIndex = 0;
  
  // Simulated task list
  final List<Map<String, dynamic>> _tasks = [
    {'id': 't1', 'name': 'Take Celecoxib 200mg', 'time': '09:00 AM', 'done': true},
    {'id': 't2', 'name': 'Joint Flexion Exercise (15 mins)', 'time': '01:00 PM', 'done': false},
    {'id': 't3', 'name': 'Drink 500ml Water Check', 'time': '04:00 PM', 'done': false},
  ];

  void _toggleTask(int index) {
    setState(() {
      _tasks[index]['done'] = !_tasks[index]['done'];
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('SurgiSense AI Dashboard', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 18)),
        actions: [
          IconButton(
            icon: const Icon(Icons.notifications_none_rounded),
            onPressed: () {},
          ),
        ],
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            // Recovery Score Card
            Card(
              color: MedicalTheme.primaryBlue,
              child: Padding(
                padding: const EdgeInsets.all(20.0),
                child: Row(
                  children: [
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text(
                            'RECOVERY PASSPORT SCORE',
                            style: TextStyle(color: Colors.white70, fontSize: 10, fontWeight: FontWeight.bold, letterSpacing: 1),
                          ),
                          const SizedBox(height: 4),
                          const Text(
                            'On Track Recovery',
                            style: TextStyle(color: Colors.white, fontSize: 20, fontWeight: FontWeight.bold),
                          ),
                          const SizedBox(height: 8),
                          Text(
                            'Estimated discharge: July 24',
                            style: TextStyle(color: Colors.white.withOpacity(0.8), fontSize: 12),
                          ),
                        ],
                      ),
                    ),
                    Container(
                      height: 70,
                      width: 70,
                      decoration: BoxDecoration(
                        color: Colors.white24,
                        shape: BoxShape.circle,
                        border: Border.all(color: Colors.white, width: 2),
                      ),
                      child: const Center(
                        child: Text(
                          '82%',
                          style: TextStyle(color: Colors.white, fontSize: 22, fontWeight: FontWeight.black),
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 20),

            // Navigation shortcuts
            Row(
              children: [
                Expanded(
                  child: _buildShortcutsCard(
                    context,
                    'Recovery Twin',
                    Icons.analytics_outlined,
                    '/twin',
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: _buildShortcutsCard(
                    context,
                    'Clinical Replay',
                    Icons.play_circle_outline_rounded,
                    '/replay',
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: _buildShortcutsCard(
                    context,
                    'Passport Logs',
                    Icons.history_edu_rounded,
                    '/passport',
                  ),
                ),
              ],
            ),
            const SizedBox(height: 24),

            // Today's checklist
            const Text(
              'Rehabilitation Care Tasks',
              style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 12),
            Card(
              child: Padding(
                padding: const EdgeInsets.symmetric(vertical: 8.0),
                child: Column(
                  children: List.generate(_tasks.length, (index) {
                    final task = _tasks[index];
                    return CheckboxListTile(
                      title: Text(task['name'], style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13, decoration: task['done'] ? TextDecoration.lineThrough : null)),
                      subtitle: Text(task['time'], style: const TextStyle(fontSize: 11)),
                      value: task['done'],
                      activeColor: MedicalTheme.primaryBlue,
                      onChanged: (val) => _toggleTask(index),
                    );
                  }),
                ),
              ),
            ),
            const SizedBox(height: 24),

            // Upload actions
            Row(
              children: [
                Expanded(
                  child: OutlinedButton.icon(
                    onPressed: () {},
                    icon: const Icon(Icons.camera_alt_outlined),
                    label: const Text('Wound Checkup', style: TextStyle(fontWeight: FontWeight.bold)),
                    style: OutlinedButton.styleFrom(
                      padding: const EdgeInsets.symmetric(vertical: 14),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                    ),
                  ),
                ),
                const SizedBox(width: 16),
                Expanded(
                  child: OutlinedButton.icon(
                    onPressed: () {},
                    icon: const Icon(Icons.upload_file_outlined),
                    label: const Text('Add Document', style: TextStyle(fontWeight: FontWeight.bold)),
                    style: OutlinedButton.styleFrom(
                      padding: const EdgeInsets.symmetric(vertical: 14),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                    ),
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
      bottomNavigationBar: BottomNavigationBar(
        currentIndex: _currentIndex,
        selectedItemColor: MedicalTheme.primaryBlue,
        unselectedItemColor: Colors.grey,
        onTap: (index) {
          setState(() {
            _currentIndex = index;
          });
          if (index == 1) context.push('/passport');
          if (index == 2) context.push('/twin');
          if (index == 3) context.push('/profile');
        },
        items: const [
          BottomNavigationBarItem(icon: Icon(Icons.home_filled), label: 'Dashboard'),
          BottomNavigationBarItem(icon: Icon(Icons.history_rounded), label: 'Passport'),
          BottomNavigationBarItem(icon: Icon(Icons.insights_rounded), label: 'Twin'),
          BottomNavigationBarItem(icon: Icon(Icons.person_outline_rounded), label: 'Profile'),
        ],
      ),
    );
  }

  Widget _buildShortcutsCard(BuildContext context, String title, IconData icon, String path) {
    return InkWell(
      onTap: () => context.push(path),
      borderRadius: BorderRadius.circular(12),
      child: Card(
        child: Padding(
          padding: const EdgeInsets.symmetric(vertical: 16.0, horizontal: 8.0),
          child: Column(
            children: [
              Icon(icon, size: 28, color: MedicalTheme.primaryBlue),
              const SizedBox(height: 8),
              Text(
                title,
                textAlign: TextAlign.center,
                style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 11),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
