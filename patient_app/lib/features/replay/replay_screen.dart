import 'dart:async';
import 'package:flutter/material';
import 'package:go_router/go_router.dart';
import '../../core/theme/medical_theme.dart';

class ReplayScreen extends StatefulWidget {
  const ReplayScreen({super.key});

  @override
  State<ReplayScreen> createState() => _ReplayScreenState();
}

class _ReplayScreenState extends State<ReplayScreen> {
  int _currentStep = 0;
  bool _isPlaying = false;
  Timer? _timer;

  final List<Map<String, dynamic>> _story = [
    {
      'day': 0,
      'date': 'July 05',
      'score': 65,
      'narration': 'Onboarding and discharge. Left knee arthroplasty replacement completed. General mobility parameters loaded as signature baseline. Patient registered on ERAS joint recovery checklist.',
    },
    {
      'day': 3,
      'date': 'July 08',
      'score': 74,
      'narration': 'Day 3 Checkup. Incision vision AI checks indicate minimal swelling. Patient records paracetamol and walking adherence at 88%. Range of motion exercises initialized.',
    },
    {
      'day': 5,
      'date': 'July 10',
      'score': 82,
      'narration': 'Day 5 Progress. Joint flexion reaches 78 degrees. Minor localized swelling tracked on wound picture upload. Celecoxib adherence remains stable. AI baselines on track.',
    }
  ];

  void _togglePlay() {
    if (_isPlaying) {
      _timer?.cancel();
    } else {
      _timer = Timer.periodic(const Duration(seconds: 3), (timer) {
        if (_currentStep < _story.length - 1) {
          setState(() {
            _currentStep++;
          });
        } else {
          setState(() {
            _isPlaying = false;
          });
          _timer?.cancel();
        }
      });
    }
    setState(() {
      _isPlaying = !_isPlaying;
    });
  }

  @override
  void dispose() {
    _timer?.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final activeStory = _story[_currentStep];

    return Scaffold(
      appBar: AppBar(
        title: const Text('Clinical Replay Player', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_rounded),
          onPressed: () => context.go('/'),
        ),
      ),
      body: Padding(
        padding: const EdgeInsets.all(20.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            // Playback card
            Card(
              child: Padding(
                padding: const EdgeInsets.all(16.0),
                child: Column(
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text(
                          'Telemetry Replay',
                          style: TextStyle(fontWeight: FontWeight.bold, color: Colors.grey[600], fontSize: 11),
                        ),
                        Text(
                          'Step ${_currentStep + 1} of ${_story.length}',
                          style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 12),
                        ),
                      ],
                    ),
                    const SizedBox(height: 16),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        IconButton(
                          icon: const Icon(Icons.skip_previous_rounded, size: 32),
                          onPressed: _currentStep > 0
                              ? () => setState(() {
                                    _isPlaying = false;
                                    _currentStep--;
                                  })
                              : null,
                        ),
                        IconButton(
                          icon: Icon(
                            _isPlaying ? Icons.pause_circle_filled_rounded : Icons.play_circle_filled_rounded,
                            size: 54,
                            color: MedicalTheme.primaryBlue,
                          ),
                          onPressed: _togglePlay,
                        ),
                        IconButton(
                          icon: const Icon(Icons.skip_next_rounded, size: 32),
                          onPressed: _currentStep < _story.length - 1
                              ? () => setState(() {
                                    _isPlaying = false;
                                    _currentStep++;
                                  })
                              : null,
                        ),
                      ],
                    ),
                    const SizedBox(height: 12),
                    Slider(
                      min: 0,
                      max: (_story.length - 1).toDouble(),
                      value: _currentStep.toDouble(),
                      activeColor: MedicalTheme.primaryBlue,
                      inactiveColor: Colors.black12,
                      divisions: _story.length - 1,
                      onChanged: (val) {
                        setState(() {
                          _isPlaying = false;
                          _currentStep = val.toInt();
                        });
                      },
                    ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 24),

            // Telemetry readings
            Row(
              children: [
                Expanded(
                  child: Card(
                    color: Colors.slate[900],
                    child: Padding(
                      padding: const EdgeInsets.symmetric(vertical: 16.0),
                      child: Column(
                        children: [
                          const Icon(Icons.calendar_today_rounded, color: Colors.white70, size: 20),
                          const SizedBox(height: 4),
                          Text(activeStory['date'], style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
                          const Text('Timeline Check', style: TextStyle(color: Colors.white30, fontSize: 10)),
                        ],
                      ),
                    ),
                  ),
                ),
                const SizedBox(width: 16),
                Expanded(
                  child: Card(
                    color: Colors.slate[900],
                    child: Padding(
                      padding: const EdgeInsets.symmetric(vertical: 16.0),
                      child: Column(
                        children: [
                          const Icon(Icons.speed_rounded, color: Colors.white70, size: 20),
                          const SizedBox(height: 4),
                          Text('${activeStory['score']}%', style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
                          const Text('Healing Level', style: TextStyle(color: Colors.white30, fontSize: 10)),
                        ],
                      ),
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 24),

            // Speech narration box
            Expanded(
              child: Container(
                padding: const EdgeInsets.all(20.0),
                decoration: BoxDecoration(
                  color: Colors.grey[100],
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(color: Colors.black12),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        const Icon(Icons.graphic_eq_rounded, color: MedicalTheme.primaryBlue, size: 18),
                        const SizedBox(width: 6),
                        Text(
                          'AI VOICE SYNTHESIS',
                          style: TextStyle(fontWeight: FontWeight.bold, fontSize: 10, color: Colors.grey[600], letterSpacing: 1),
                        ),
                      ],
                    ),
                    const SizedBox(height: 12),
                    Expanded(
                      child: SingleChildScrollView(
                        child: Text(
                          activeStory['narration'],
                          style: const TextStyle(
                            fontSize: 14,
                            height: 1.5,
                            fontStyle: FontStyle.italic,
                            fontWeight: FontWeight.w500,
                          ),
                        ),
                      ),
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
}
