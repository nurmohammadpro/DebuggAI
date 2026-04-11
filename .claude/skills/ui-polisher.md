---
name: ui-polisher
description: Track 5 - Flutter UI/UX (U01-U15). Wire history to real data, add streaming typing effect, HTML preview, responsive fixes, error handling, and polish features. P1-P2 priority.
type: skill
---

# Flutter UI/UX Polisher

**Purpose**: Complete Flutter UI work - wire real data, add streaming effects, fix responsive layouts, and add error handling.

**Priority**: P1-P2 - Core UX gaps are P1. Polish and delight features are P2.

---

## U01 - Wire Recent Activity on HomeScreen to Real Data

**Time**: 1 hr | **Priority**: P1

**What's broken**: Static "No recent activity found" placeholder.

**File**: `lib/src/features/home/home_screen.dart`

**Implementation**:
```dart
class HomeScreen extends StatelessWidget {
  final DebugSessionService _sessionService = DebugSessionService(Supabase.instance.client);

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: CustomScrollView(
        slivers: [
          // ... existing sections ...

          SliverToBoxAdapter(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Text(
                'Recent Activity',
                style: Theme.of(context).textTheme.titleLarge,
              ),
            ),
          ),

          SliverFillRemaining(
            child: FutureBuilder<List<DebugSession>>(
              future: _sessionService.getHistory(),
              builder: (context, snapshot) {
                if (snapshot.connectionState == ConnectionState.waiting) {
                  return const Center(child: CircularProgressIndicator());
                }

                if (snapshot.hasError) {
                  return Center(child: Text('Error loading history: ${snapshot.error}'));
                }

                final sessions = snapshot.data ?? [];

                if (sessions.isEmpty) {
                  return const Center(
                    child: Padding(
                      padding: EdgeInsets.all(16),
                      child: Text(
                        'No sessions yet — start a debug session.',
                        style: TextStyle(color: Colors.grey),
                      ),
                    ),
                  );
                }

                return ListView.builder(
                  itemCount: sessions.length,
                  itemBuilder: (context, index) {
                    return DebugSessionCard(session: sessions[index]);
                  },
                );
              },
            ),
          ),
        ],
      ),
    );
  }
}
```

**Verification**: Real sessions appear on home screen.

---

## U02 - Build DebugSessionCard Widget

**Time**: 1 hr | **Priority**: P1

**File**: `lib/src/features/home/widgets/debug_session_card.dart` (new)

**Implementation**:
```dart
import 'package:flutter/material.dart';
import 'package:timeago/timeago.dart' as timeago;
import 'package:debuggai/models/debug_session.dart';

class DebugSessionCard extends StatelessWidget {
  final DebugSession session;

  const DebugSessionCard({Key? key, required this.session}) : super(key: key);

  Color _getActionColor(String actionType) {
    switch (actionType) {
      case 'analyze':
        return Colors.blue;
      case 'reverse':
        return Colors.purple;
      case 'web':
        return Colors.green;
      default:
        return Colors.grey;
    }
  }

  String _formatActionType(String actionType) {
    switch (actionType) {
      case 'analyze':
        return 'Analyze';
      case 'reverse':
        return 'Reverse';
      case 'web':
        return 'Web Builder';
      default:
        return actionType;
    }
  }

  @override
  Widget build(BuildContext context) {
    return Card(
      margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      child: InkWell(
        onTap: () {
          // Navigate to debug screen and restore result
          Navigator.of(context).pushNamed('/debug', arguments: session);
        },
        child: Padding(
          padding: const EdgeInsets.all(12),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                    decoration: BoxDecoration(
                      color: _getActionColor(session.actionType).withOpacity(0.2),
                      borderRadius: BorderRadius.circular(4),
                    ),
                    child: Text(
                      _formatActionType(session.actionType),
                      style: TextStyle(
                        color: _getActionColor(session.actionType),
                        fontWeight: FontWeight.bold,
                        fontSize: 12,
                      ),
                    ),
                  ),
                  const Spacer(),
                  Text(
                    timeago.format(session.createdAt),
                    style: Theme.of(context).textTheme.bodySmall,
                  ),
                ],
              ),
              const SizedBox(height: 8),
              Text(
                session.title,
                style: Theme.of(context).textTheme.titleMedium,
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
              ),
              if (session.filesCount > 0) ...[
                const SizedBox(height: 4),
                Row(
                  children: [
                    const Icon(Icons.insert_drive_file, size: 14, color: Colors.grey),
                    const SizedBox(width: 4),
                    Text(
                      '${session.filesCount} files',
                      style: Theme.of(context).textTheme.bodySmall,
                    ),
                  ],
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }
}
```

**Verification**: Cards show with correct badges and formatting.

---

## U03 - Add Live Streaming Typing Effect

**Time**: 1 hr | **Priority**: P1

**File**: `lib/src/features/debugger/debug_builder_screen.dart`

**Implementation**:
```dart
class _DebugBuilderScreenState extends State<DebugBuilderScreen> {
  final ScrollController _scrollController = ScrollController();
  StreamSubscription<String>? _streamSubscription;
  String _result = '';
  bool _isStreaming = false;

  void _startAnalysis() async {
    setState(() {
      _isStreaming = true;
      _result = '';
    });

    _streamSubscription = DebugAIService().analyzeProblem(_prompt, _files).listen(
      (chunk) {
        setState(() {
          _result += chunk;
        });

        // Auto-scroll to bottom
        WidgetsBinding.instance.addPostFrameCallback((_) {
          if (_scrollController.hasClients) {
            _scrollController.animateTo(
              _scrollController.position.maxScrollExtent,
              duration: const Duration(milliseconds: 50),
              curve: Curves.easeOut,
            );
          }
        });
      },
      onDone: () {
        setState(() {
          _isStreaming = false;
        });
        _autoSaveSession();
      },
      onError: (error) {
        setState(() {
          _isStreaming = false;
          _error = error.toString();
        });
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Expanded(
          child: SingleChildScrollView(
            controller: _scrollController,
            child: Text(_result),
          ),
        ),
        if (_isStreaming)
          AnimatedContainer(
            duration: const Duration(milliseconds: 500),
            width: 8,
            height: 16,
            decoration: BoxDecoration(
              color: Colors.greenAccent,
              borderRadius: BorderRadius.circular(2),
            ),
          ),
      ],
    );
  }

  @override
  void dispose() {
    _streamSubscription?.cancel();
    _scrollController.dispose();
    super.dispose();
  }
}
```

**Verification**: Text appears with cursor animation and auto-scrolls.

---

## U04 - Add HTML Preview Iframe to WebBuilderScreen

**Time**: 1 hr | **Priority**: P1

**File**: `lib/src/features/web_builder/web_builder_screen.dart`

**Implementation (Flutter web only)**:
```dart
import 'dart:html' as html;
import 'dart:ui_web' as ui_web;

class HtmlPreviewWidget extends StatefulWidget {
  final String htmlCode;

  const HtmlPreviewWidget({Key? key, required this.htmlCode}) : super(key: key);

  @override
  State<HtmlPreviewWidget> createState() => _HtmlPreviewWidgetState();
}

class _HtmlPreviewWidgetState extends State<HtmlPreviewWidget> {
  late html.IFrameElement _iframeElement;
  final String _viewId = 'html-preview-${DateTime.now().millisecondsSinceEpoch}';

  @override
  void initState() {
    super.initState();
    _initIframe();
  }

  void _initIframe() {
    _iframeElement = html.IFrameElement()
      ..srcdoc = widget.htmlCode
      ..style.width = '100%'
      ..style.height = '100%'
      ..style.border = 'none'
      ..sandbox = 'allow-scripts allow-same-origin';

    // Register view
    ui_web.platformViewRegistry.registerViewFactory(
      _viewId,
      (int viewId) => _iframeElement,
    );
  }

  @override
  void didUpdateWidget(HtmlPreviewWidget oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.htmlCode != widget.htmlCode) {
      _iframeElement.srcdoc = widget.htmlCode;
    }
  }

  @override
  Widget build(BuildContext context) {
    return HtmlElementView(viewType: _viewId);
  }
}

// Mobile fallback - show code only
class MobileHtmlPreview extends StatelessWidget {
  final String htmlCode;

  const MobileHtmlPreview({Key? key, required this.htmlCode}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Generated HTML')),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: SelectableText(htmlCode),
      ),
      floatingActionButton: FloatingActionButton(
        onPressed: () => _copyToClipboard(context, htmlCode),
        child: const Icon(Icons.copy),
      ),
    );
  }

  void _copyToClipboard(BuildContext context, String text) {
    Clipboard.setData(ClipboardData(text: text));
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(content: Text('Copied to clipboard')),
    );
  }
}
```

**Verification**: HTML renders in iframe on web, shows code on mobile.

---

## U05 - Add Copy HTML and Download .html Buttons

**Time**: 1 hr | **Priority**: P1

**File**: `lib/src/features/web_builder/web_builder_screen.dart`

**Implementation**:
```dart
class WebBuilderScreen extends StatelessWidget {
  void _copyHtml(BuildContext context, String html) {
    Clipboard.setData(ClipboardData(text: html));
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(content: Text('HTML copied to clipboard')),
    );
  }

  void _downloadHtml(BuildContext context, String html) async {
    if (kIsWeb) {
      // Web version
      final blob = html.Blob([html], 'text/html');
      final url = html.Url.createObjectUrlFromBlob(blob);
      final anchor = html.AnchorElement()
        ..href = url
        ..download = 'website.html'
        ..click();
      html.Url.revokeObjectUrl(url);
    } else {
      // Mobile version - use share_plus or file saving
      // ...
    }
  }

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        IconButton(
          icon: const Icon(Icons.copy),
          onPressed: () => _copyHtml(context, _generatedHtml),
          tooltip: 'Copy HTML',
        ),
        if (kIsWeb)
          IconButton(
            icon: const Icon(Icons.download),
            onPressed: () => _downloadHtml(context, _generatedHtml),
            tooltip: 'Download .html',
          ),
      ],
    );
  }
}
```

**Verification**: Copy and download work correctly.

---

## U06 - Fix DebugBuilderScreen on Mobile Screens

**Time**: 1 hr | **Priority**: P1

**File**: `lib/src/features/debugger/debug_builder_screen.dart`

**Implementation**:
```dart
class DebugBuilderScreen extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return LayoutBuilder(
      builder: (context, constraints) {
        final isMobile = constraints.maxWidth < 600;
        final isDesktop = constraints.maxWidth >= 900;

        return Scaffold(
          body: Row(
            children: [
              // Input panel
              Expanded(
                flex: isDesktop ? 1 : 0,
                child: Container(
                  padding: EdgeInsets.all(isMobile ? 12 : 24),
                  child: Column(
                    children: [
                      TextField(
                        maxLines: isMobile ? 5 : 8,
                        decoration: const InputDecoration(
                          hintText: 'Describe your bug...',
                        ),
                      ),
                      if (isMobile)
                        ExpansionTile(
                          title: const Text('Actions'),
                          children: [
                            _buildActionsPanel(),
                          ],
                        )
                      else
                        _buildActionsPanel(),
                    ],
                  ),
                ),
              ),

              // Output panel
              Expanded(
                flex: isDesktop ? 1 : 0,
                child: _buildOutputPanel(),
              ),
            ],
          ),
        );
      }
    );
  }
}
```

**Verification**: Layout adapts correctly on mobile vs desktop.

---

## U07 - Add Bottom Navigation Bar on Mobile

**Time**: 2 hr | **Priority**: P2

**File**: `lib/src/widgets/app_scaffold.dart`

**Implementation**:
```dart
class AppScaffold extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return LayoutBuilder(
      builder: (context, constraints) {
        final isMobile = constraints.maxWidth < 600;

        if (isMobile) {
          return Scaffold(
            body: IndexedStack(
              index: _currentIndex,
              children: _screens,
            ),
            bottomNavigationBar: BottomNavigationBar(
              currentIndex: _currentIndex,
              onTap: (index) => setState(() => _currentIndex = index),
              items: const [
                BottomNavigationBarItem(
                  icon: Icon(Icons.home),
                  label: 'Home',
                ),
                BottomNavigationBarItem(
                  icon: Icon(Icons.bug_report),
                  label: 'Debug',
                ),
                BottomNavigationBarItem(
                  icon: Icon(Icons.web),
                  label: 'Web Builder',
                ),
                BottomNavigationBarItem(
                  icon: Icon(Icons.folder_open),
                  label: 'Exports',
                ),
              ],
            ),
          );
        }

        // Desktop: use drawer
        return Scaffold(
          drawer: const AppDrawer(),
          body: _screens[_currentIndex],
        );
      },
    );
  }
}
```

**Verification**: Bottom nav shows on mobile, drawer on desktop.

---

## U08 - Fix WebBuilderScreen Chat Bubble Overflow

**Time**: 1 hr | **Priority**: P1

**File**: `lib/src/features/web_builder/web_builder_screen.dart`

**Implementation**:
```dart
class ChatBubble extends StatelessWidget {
  final String content;
  final bool isUser;

  @override
  Widget build(BuildContext context) {
    return Align(
      alignment: isUser ? Alignment.centerRight : Alignment.centerLeft,
      child: Container(
        constraints: BoxConstraints(
          maxWidth: MediaQuery.of(context).size.width * 0.85,
        ),
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          color: isUser ? Colors.blue : Colors.grey[200],
          borderRadius: BorderRadius.circular(8),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(content),
            if (_containsCode(content))
              SingleChildScrollView(
                scrollDirection: Axis.horizontal,
                child: Text(
                  _extractCode(content),
                  style: TextStyle(fontFamily: 'monospace'),
                ),
              ),
          ],
        ),
      ),
    );
  }
}
```

**Verification**: Messages don't overflow on small screens.

---

## U09 - Add Proper Error Handling to DebugBuilderScreen

**Time**: 1 hr | **Priority**: P1

**File**: `lib/src/features/debugger/debug_builder_screen.dart`

**Implementation**:
```dart
class ErrorWidget extends StatelessWidget {
  final String error;
  final VoidCallback onRetry;

  @override
  Widget build(BuildContext context) {
    final errorType = _getErrorType(error);

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.red.shade50,
        border: Border.all(color: Colors.red.shade200),
        borderRadius: BorderRadius.circular(8),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(Icons.error_outline, color: Colors.red.shade700),
              const SizedBox(width: 8),
              Text(
                errorType,
                style: TextStyle(
                  fontWeight: FontWeight.bold,
                  color: Colors.red.shade700,
                ),
              ),
            ],
          ),
          const SizedBox(height: 8),
          Text(
            _getHumanReadableMessage(error),
            style: const TextStyle(color: Colors.black87),
          ),
          const SizedBox(height: 8),
          ElevatedButton.icon(
            onPressed: onRetry,
            icon: const Icon(Icons.refresh),
            label: const Text('Retry'),
          ),
        ],
      ),
    );
  }

  String _getErrorType(String error) {
    if (error.contains('402') || error.contains('credits')) {
      return 'Insufficient Credits';
    }
    if (error.contains('401') || error.contains('auth')) {
      return 'Authentication Error';
    }
    if (error.contains('500') || error.contains('server')) {
      return 'Server Error';
    }
    return 'Error';
  }

  String _getHumanReadableMessage(String error) {
    if (error.contains('402')) {
      return 'You\'ve run out of credits. Please upgrade to Pro or purchase more credits to continue.';
    }
    if (error.contains('401')) {
      return 'Please log in to continue debugging.';
    }
    if (error.contains('500')) {
      return 'Something went wrong on our end. Please try again.';
    }
    return error;
  }
}
```

**Verification**: Clear error messages with retry button.

---

## U10 - Add Skeleton Loaders to HomeScreen

**Time**: 1 hr | **Priority**: P1

**File**: `lib/src/features/home/home_screen.dart`

**Implementation**:
```dart
class SkeletonLoader extends StatefulWidget {
  @override
  State<SkeletonLoader> createState() => _SkeletonLoaderState();
}

class _SkeletonLoaderState extends State<SkeletonLoader>
    with SingleTickerProviderStateMixin {
  late AnimationController _controller;
  late Animation<double> _animation;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      duration: const Duration(milliseconds: 1500),
      vsync: this,
    )..repeat();

    _animation = Tween<double>(begin: -2, end: 2).animate(
      CurvedAnimation(parent: _controller, curve: Curves.easeInOutSine),
    );
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: _animation,
      builder: (context, child) {
        return Container(
          decoration: BoxDecoration(
            gradient: LinearGradient(
              begin: Alignment.centerLeft,
              end: Alignment.centerRight,
              colors: [
                Colors.grey[300]!,
                Colors.grey[100]!,
                Colors.grey[300]!,
              ],
              stops: [
                0.0,
                0.5 + _animation.value * 0.1,
                1.0,
              ],
            ),
          ),
        );
      },
    );
  }
}

// Usage in HomeScreen
if (sessionStore.isLoading) {
  return Column(
    children: [
      SkeletonLoader(height: 60, width: 200), // Credits card
      SkeletonLoader(height: 60, width: 200), // Bugs fixed card
    ],
  );
}
```

**Verification**: Shimmer effect shows during loading.

---

## U11 - Handle Unconfigured Supabase State

**Time**: 1 hr | **Priority**: P1

**File**: `lib/src/services/supabase_service.dart` + `lib/main.dart`

**Implementation**:
```dart
class SupabaseService {
  static bool get isConfigured =>
      const String.fromEnvironment('SUPABASE_URL').isNotEmpty &&
      const String.fromEnvironment('SUPABASE_ANON_KEY').isNotEmpty;
}

// In main.dart or a wrapper widget
class AppInitialization extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    if (!SupabaseService.isConfigured) {
      return const Scaffold(
        body: Center(
          child: Padding(
            padding: EdgeInsets.all(24),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Icon(Icons.error_outline, size: 64, color: Colors.orange),
                SizedBox(height: 16),
                Text(
                  'App Not Configured',
                  style: TextStyle(fontSize: 24, fontWeight: FontWeight.bold),
                ),
                SizedBox(height: 8),
                Text(
                  'This app requires Supabase environment variables to be set.\n\n'
                  'Please run with:\n'
                  'flutter run --dart-define=SUPABASE_URL=your-url --dart-define=SUPABASE_ANON_KEY=your-key',
                  textAlign: TextAlign.center,
                  style: TextStyle(color: Colors.grey),
                ),
              ],
            ),
          ),
        ),
      );
    }

    return const MyApp();
  }
}
```

**Verification**: Shows friendly message when env vars not set.

---

## U12 - Polish the 404 Route Error Page

**Time**: 1 hr | **Priority**: P2

**File**: `lib/src/core/app_router.dart`

**Implementation**:
```dart
GoRouter(
  errorBuilder: (context, state) {
    return Scaffold(
      body: Center(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              // Logo
              Image.asset('assets/logo.png', width: 80, height: 80),
              const SizedBox(height: 24),

              // Error message
              const Text(
                'Page Not Found',
                style: TextStyle(fontSize: 28, fontWeight: FontWeight.bold),
              ),
              const SizedBox(height: 8),
              Text(
                'The page you\'re looking for doesn\'t exist.',
                style: TextStyle(color: Colors.grey[600]),
              ),
              const SizedBox(height: 32),

              // Buttons
              ElevatedButton(
                onPressed: () => context.go('/'),
                child: const Text('Go to Dashboard'),
              ),
              TextButton(
                onPressed: () => Navigator.of(context).pop(),
                child: const Text('Go Back'),
              ),
            ],
          ),
        ),
      ),
    );
  },
)
```

**Verification**: Branded 404 page with navigation options.

---

## U13 - Add Device Preview Toggle to Web Builder

**Time**: 2 hr | **Priority**: P2

**File**: `lib/src/features/web_builder/web_builder_screen.dart`

**Implementation**:
```dart
enum PreviewDevice { phone, tablet, desktop }

class WebBuilderScreen extends StatelessWidget {
  PreviewDevice _selectedDevice = PreviewDevice.desktop;

  double _getDeviceWidth(PreviewDevice device) {
    switch (device) {
      case PreviewDevice.phone:
        return 375;
      case PreviewDevice.tablet:
        return 768;
      case PreviewDevice.desktop:
        return double.infinity;
    }
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        // Device toggle buttons
        Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            IconButton(
              icon: const Icon(Icons.phone_iphone),
              isSelected: _selectedDevice == PreviewDevice.phone,
              onPressed: () => setState(() => _selectedDevice = PreviewDevice.phone),
            ),
            IconButton(
              icon: const Icon(Icons.tablet),
              isSelected: _selectedDevice == PreviewDevice.tablet,
              onPressed: () => setState(() => _selectedDevice = PreviewDevice.tablet),
            ),
            IconButton(
              icon: const Icon(Icons.desktop_windows),
              isSelected: _selectedDevice == PreviewDevice.desktop,
              onPressed: () => setState(() => _selectedDevice = PreviewDevice.desktop),
            ),
          ],
        ),

        // Preview with constraint
        SizedBox(
          width: _getDeviceWidth(_selectedDevice),
          child: HtmlPreviewWidget(htmlCode: _generatedHtml),
        ),
      ],
    );
  }
}
```

**Verification**: Preview resizes based on selected device.

---

## U14 - Add Share Button to Debug Results

**Time**: 1 hr | **Priority**: P2

**File**: `lib/src/features/debugger/debug_builder_screen.dart`

**Implementation**:
```dart
import 'package:share_plus/share_plus.dart';

class DebugBuilderScreen extends StatelessWidget {
  void _shareResult(String result) {
    final formattedResult = '''
Debug Analysis Result from DeBuggAI:

$result

---
Generated by DeBuggAI
''';

    Share.share(formattedResult);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Debug Analysis'),
        actions: [
          IconButton(
            icon: const Icon(Icons.share),
            onPressed: () => _shareResult(_result),
            tooltip: 'Share result',
          ),
        ],
      ),
      // ...
    );
  }
}
```

**Verification**: Share dialog opens with formatted text.

---

## U15 - Wire Matrix Background to Landing Hero

**Time**: 2 hr | **Priority**: P2

**File**: `lib/src/features/landing/landing_hero.dart`

**Implementation**:
```dart
import 'package:debuggai/common_widgets/matrix_background.dart';

class LandingHero extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return Stack(
      children: [
        // Matrix background with reduced opacity
        Opacity(
          opacity: 0.3,
          child: const MatrixBackground(),
        ),

        // Hero content
        Center(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Text(
                'DeBuggAI',
                style: Theme.of(context).textTheme.displayLarge,
              ),
              const SizedBox(height: 16),
              Text(
                'AI-Powered Debugging for Flutter',
                style: Theme.of(context).textTheme.headlineMedium,
              ),
              // ... rest of hero content ...
            ],
          ),
        ),
      ],
    );
  }
}
```

**Verification**: Matrix animation shows behind hero content.

---

## Completion Checklist

- [ ] U01: Recent Activity wired to real data
- [ ] U02: DebugSessionCard widget created
- [ ] U03: Live streaming typing effect added
- [ ] U04: HTML preview iframe (web) / code (mobile)
- [ ] U05: Copy and Download .html buttons
- [ ] U06: Mobile responsive layout fixed
- [ ] U07: Bottom navigation bar on mobile (P2)
- [ ] U08: Chat bubble overflow fixed
- [ ] U09: Proper error handling widget
- [ ] U10: Skeleton loaders on HomeScreen
- [ ] U11: Unconfigured Supabase state handled
- [ ] U12: Polished 404 page (P2)
- [ ] U13: Device preview toggle (P2)
- [ ] U14: Share button added (P2)
- [ ] U15: Matrix background wired (P2)

**Next tracks**: Track 6 (Payments) or Track 7 (Referrals).
