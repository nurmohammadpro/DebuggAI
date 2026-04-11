---
name: flutter-core-fixer
description: Track 4 - Flutter Core (F01-F12). Fix missing service file that crashes app, create streaming service, session persistence, models, and state management improvements. P0-P2 priority.
type: skill
---

# Flutter Core Fixer

**Purpose**: Fix critical app crashes, create missing services, add streaming support, and improve state management.

**Priority**: P0-P2 - F01 is P0 (app crash). F02-F09 are P1. F10-F12 are P2.

---

## F01 - Create the Missing web_builder_service.dart

**Time**: 30 min | **Priority**: P0

**What's broken**: WebBuilderScreen imports this file but it doesn't exist. Route crashes on load.

**File**: `lib/src/services/web_builder_service.dart` (create new)

**Implementation**:
```dart
import 'package:supabase_flutter/supabase_flutter.dart';

class WebBuilderService {
  final SupabaseClient _client;

  WebBuilderService(this._client);

  /// Send message to generate-web-code edge function
  /// Returns a stream of text chunks (SSE)
  Future<Stream<String>> sendMessage({
    required String prompt,
    required List<Map<String, String>> history,
  }) async {
    final response = await _client.functions.invoke(
      'generate-web-code',
      body: {
        'prompt': prompt,
        'history': history,
      },
    );

    if (response.status != 200) {
      throw Exception('Failed to generate code: ${response.data}');
    }

    // Parse SSE stream from response
    // For now, return single response until B05 implements streaming
    final html = response.data['html'] ?? '';
    return Stream.value(html);
  }

  /// Get saved web builder sessions
  Future<List<Map<String, dynamic>>> getSessions() async {
    final response = await _client.functions.invoke(
      'get-web-builder-history',
    );

    if (response.status != 200) {
      throw Exception('Failed to get history');
    }

    return List<Map<String, dynamic>>.from(response.data);
  }
}
```

**Verification**: App no longer crashes when navigating to WebBuilderScreen.

---

## F02 - Wire WebBuilderScreen to WebBuilderService

**Time**: 1 hr | **Priority**: P0

**What's broken**: Current code has placeholder Supabase calls.

**File**: `lib/src/features/web_builder/web_builder_screen.dart`

**Fix**:
```dart
class WebBuilderScreen extends StatefulWidget {
  // ...

  @override
  State<WebBuilderScreen> createState() => _WebBuilderScreenState();
}

class _WebBuilderScreenState extends State<WebBuilderScreen> {
  final WebBuilderService _service = WebBuilderService(Supabase.instance.client);
  final TextEditingController _promptController = TextEditingController();
  bool _isLoading = false;
  String? _error;
  String _generatedHtml = '';

  Future<void> _sendMessage() async {
    if (_promptController.text.isEmpty) return;

    setState(() {
      _isLoading = true;
      _error = null;
    });

    try {
      final stream = await _service.sendMessage(
        prompt: _promptController.text,
        history: _chatHistory,
      );

      // Subscribe to stream (after B05 implements true streaming)
      stream.listen((chunk) {
        setState(() {
          _generatedHtml += chunk;
        });
      });

      // Add to history
      _chatHistory.add({'role': 'user', 'content': _promptController.text});
      _chatHistory.add({'role': 'assistant', 'content': _generatedHtml});
    } catch (e) {
      setState(() {
        _error = _handleError(e);
      });
    } finally {
      setState(() {
        _isLoading = false;
      });
    }
  }

  String _handleError(dynamic error) {
    // Handle specific error cases
    if (error.toString().contains('402')) {
      return 'Insufficient credits. Please upgrade to Pro.';
    }
    if (error.toString().contains('401')) {
      return 'Please log in to continue.';
    }
    return 'An error occurred. Please try again.';
  }
}
```

**Verification**: Web builder generates HTML and displays it.

---

## F03 - Create StreamingDebugService for SSE Responses

**Time**: 1 hr | **Priority**: P1

**What's needed**: Parse SSE streams from edge functions.

**File**: `lib/src/services/streaming_debug_service.dart` (new)

**Implementation**:
```dart
import 'dart:async';
import 'package:http/http.dart' as http;

class StreamingDebugService {
  final String _functionUrl;
  final String _accessToken;

  StreamingDebugService({
    required String functionUrl,
    required String accessToken,
  })  : _functionUrl = functionUrl,
        _accessToken = accessToken;

  /// Stream text chunks from SSE endpoint
  Stream<String> streamResponse(String prompt) async* {
    final request = http.Request('POST', Uri.parse(_functionUrl));
    request.headers['Authorization'] = 'Bearer $_accessToken';
    request.headers['Content-Type'] = 'application/json';
    request.body = jsonEncode({'prompt': prompt});

    final response = await http.Client().send(request);

    if (response.statusCode != 200) {
      throw Exception('Stream error: ${response.statusCode}');
    }

    final stream = response.stream
        .transform(utf8.decoder)
        .transform(const LineSplitter());

    await for (final line in stream) {
      if (line.isEmpty) continue;
      if (!line.startsWith('data: ')) continue;

      final data = line.substring(6); // Remove 'data: ' prefix

      if (data == '[DONE]') {
        break;
      }

      try {
        final json = jsonDecode(data);
        final content = json['content'] as String?;
        if (content != null) {
          yield content;
        }
      } catch (e) {
        // Skip invalid JSON
      }
    }
  }
}
```

**Verification**: Service parses SSE chunks correctly.

---

## F04 - Update DebugAIService to Use StreamingDebugService

**Time**: 1 hr | **Priority**: P1

**File**: `lib/src/services/debug_ai_service.dart`

**Changes**:
```dart
// BEFORE
Future<String> analyzeProblem(String prompt, List<File> files) async {
  // ... returns single string
}

// AFTER
Stream<String> analyzeProblem(String prompt, List<File> files) async* {
  final service = StreamingDebugService(
    functionUrl: '${Supabase.instance.client.functions.url}/debug-ai-analyze',
    accessToken: Supabase.instance.client.auth.currentSession?.accessToken ?? '',
  );

  yield* service.streamResponse(prompt);
}

Stream<String> runReverseBuilder(String code, {bool isZeroKnowledge = false}) async* {
  final service = StreamingDebugService(
    functionUrl: '${Supabase.instance.client.functions.url}/debug-ai-reverse',
    accessToken: Supabase.instance.client.functions.url,
  );

  yield* service.streamResponse(jsonEncode({
    'code': code,
    'isZeroKnowledge': isZeroKnowledge,
  }));
}
```

**Verification**: DebugBuilderScreen shows streaming text.

---

## F05 - Create DebugSessionService

**Time**: 1 hr | **Priority**: P1

**File**: `lib/src/services/debug_session_service.dart` (new)

**Implementation**:
```dart
import 'package:supabase_flutter/supabase_flutter.dart';

class DebugSession {
  final String id;
  final String title;
  final String prompt;
  final String result;
  final String actionType;
  final int filesCount;
  final DateTime createdAt;

  DebugSession({
    required this.id,
    required this.title,
    required this.prompt,
    required this.result,
    required this.actionType,
    required this.filesCount,
    required this.createdAt,
  });

  factory DebugSession.fromJson(Map<String, dynamic> json) {
    return DebugSession(
      id: json['id'] as String,
      title: json['title'] as String,
      prompt: json['prompt'] as String,
      result: json['result'] as String,
      actionType: json['action_type'] as String,
      filesCount: json['files_count'] as int? ?? 0,
      createdAt: DateTime.parse(json['created_at'] as String),
    );
  }
}

class DebugSessionService {
  final SupabaseClient _client;

  DebugSessionService(this._client);

  /// Save a debug session
  Future<String> saveSession({
    required String title,
    required String prompt,
    required String result,
    required String actionType,
    int filesCount = 0,
  }) async {
    final response = await _client.functions.invoke(
      'save-debug-session',
      body: {
        'title': title,
        'prompt': prompt,
        'result': result,
        'action_type': actionType,
        'files_count': filesCount,
      },
    );

    if (response.status != 200) {
      throw Exception('Failed to save session');
    }

    return response.data['id'] as String;
  }

  /// Get recent sessions
  Future<List<DebugSession>> getHistory() async {
    final response = await _client.functions.invoke(
      'get-debug-history',
    );

    if (response.status != 200) {
      throw Exception('Failed to get history');
    }

    final list = response.data as List;
    return list.map((json) => DebugSession.fromJson(json)).toList();
  }
}
```

**Verification**: Sessions save and load correctly.

---

## F06 - Create DebugSession Model Class

**Time**: 30 min | **Priority**: P1

**Note**: Already implemented in F05 above. Extract to separate file if preferred.

**File**: `lib/src/models/debug_session.dart` (optional, separate from service)

**Implementation**: Same as F05 DebugSession class.

---

## F07 - Auto-Save Debug Sessions After Analysis

**Time**: 1 hr | **Priority**: P1

**File**: `lib/src/features/debugger/debug_builder_screen.dart`

**Implementation**:
```dart
import 'dart:async';
import 'package:flutter/foundation.dart';

class _DebugBuilderScreenState extends State<DebugBuilderScreen> {
  final DebugSessionService _sessionService = DebugSessionService(Supabase.instance.client);
  StreamSubscription<String>? _streamSubscription;

  void _startAnalysis() async {
    // ... start stream ...

    _streamSubscription = DebugAIService().analyzeProblem(_prompt, _files).listen(
      (chunk) {
        setState(() {
          _result += chunk;
        });
      },
      onDone: () {
        _autoSaveSession();
      },
      onError: (error) {
        setState(() {
          _error = error.toString();
        });
      },
    );
  }

  void _autoSaveSession() {
    // Fire and forget - don't block UI
    unawaited(
      _sessionService.saveSession(
        title: _prompt.length > 60
            ? '${_prompt.substring(0, 60)}...'
            : _prompt,
        prompt: _prompt,
        result: _result,
        actionType: 'analyze',
        filesCount: _files.length,
      ).catchError((e) {
        debugPrint('Failed to save session: $e');
      }),
    );
  }

  @override
  void dispose() {
    _streamSubscription?.cancel();
    super.dispose();
  }
}
```

**Verification**: Sessions appear in history after analysis completes.

---

## F08 - Add isAdmin to SessionStore

**Time**: 1 hr | **Priority**: P1

**File**: `lib/src/services/session_store.dart`

**Implementation**:
```dart
class SessionStore extends ChangeNotifier {
  bool _isAdmin = false;

  bool get isAdmin => _isAdmin;

  Future<void> _fetchProfile() async {
    final userId = _client.auth.currentUser?.id;
    if (userId == null) return;

    final response = await _client
        .from('profiles')
        .select()
        .eq('id', userId)
        .single();

    _displayName = response['full_name'];
    _isAdmin = response['is_admin'] ?? false;

    notifyListeners();
  }
}
```

**Verification**: `SessionStore.of(context).isAdmin` returns true for admins.

---

## F09 - Add Credits Balance to SessionStore

**Time**: 1 hr | **Priority**: P1

**File**: `lib/src/services/session_store.dart`

**Implementation**:
```dart
class SessionStore extends ChangeNotifier {
  int _credits = 0;
  RealtimeChannel? _creditsChannel;

  int get credits => _credits;

  Future<void> _fetchProfile() async {
    // ... existing code ...

    // Fetch credits
    final creditsResponse = await _client
        .from('credit_wallets')
        .select('balance')
        .eq('owner_id', userId)
        .single();

    _credits = creditsResponse['balance'] ?? 0;

    // Subscribe to realtime updates
    _creditsChannel = _client
        .channel('credits:$userId')
        .on(
          'postgres_changes',
          event: EventTypes.update,
          schema: 'public',
          table: 'credit_wallets',
          filter: 'owner_id=eq.$userId',
          (payload) {
            _credits = payload.new['balance'] ?? 0;
            notifyListeners();
          },
        )
        .subscribe();

    notifyListeners();
  }

  @override
  void dispose() {
    _creditsChannel?.unsubscribe();
    super.dispose();
  }
}
```

**Verification**: Credits update live after each AI generation.

---

## F10 - Unify Provider and Riverpod

**Time**: 2 hr | **Priority**: P2

**What's broken**: App mixes Provider (SessionStore) and Riverpod (planProvider).

**Recommendation**: Migrate SessionStore to Riverpod StateNotifier.

**File**: `lib/src/providers/session_provider.dart` (new)

**Implementation**:
```dart
import 'package:flutter_riverpod/flutter_riverpod.dart';

final sessionProvider = StateNotifierProvider<SessionNotifier, SessionState>((ref) {
  return SessionNotifier();
});

class SessionState {
  final bool isLoading;
  final String? displayName;
  final bool isAdmin;
  final int credits;

  SessionState({
    this.isLoading = true,
    this.displayName,
    this.isAdmin = false,
    this.credits = 0,
  });

  SessionState copyWith({
    bool? isLoading,
    String? displayName,
    bool? isAdmin,
    int? credits,
  }) {
    return SessionState(
      isLoading: isLoading ?? this.isLoading,
      displayName: displayName ?? this.displayName,
      isAdmin: isAdmin ?? this.isAdmin,
      credits: credits ?? this.credits,
    );
  }
}

class SessionNotifier extends StateNotifier<SessionState> {
  SessionNotifier() : super(SessionState()) {
    _init();
  }

  Future<void> _init() async {
    // Fetch profile, admin status, credits
    // Update state
  }
}
```

**Verification**: App uses Riverpod consistently.

---

## F11 - Add Sentry Crash Reporting

**Time**: 1 hr | **Priority**: P2

**File**: `pubspec.yaml` + `lib/main.dart`

**pubspec.yaml**:
```yaml
dependencies:
  sentry_flutter: ^8.0.0
```

**main.dart**:
```dart
import 'package:sentry_flutter/sentry_flutter.dart';

Future<void> main() async {
  await SentryFlutter.init(
    (options) {
      options.dsn = 'YOUR_SENTRY_DSN';
      options.tracesSampleRate = 1.0;
    },
    appRunner: () => runApp(const MyApp()),
  );
}
```

**Verification**: Errors appear in Sentry dashboard.

---

## F12 - Show App Version in SettingsScreen

**Time**: 30 min | **Priority**: P2

**File**: `lib/src/features/settings/settings_screen.dart`

**Implementation**:
```dart
import 'package:package_info_plus/package_info_plus.dart';

class SettingsScreen extends StatefulWidget {
  // ...
}

class _SettingsScreenState extends State<SettingsScreen> {
  String _version = 'Loading...';
  String _buildNumber = '';

  @override
  void initState() {
    super.initState();
    _loadVersion();
  }

  Future<void> _loadVersion() async {
    final info = await PackageInfo.fromPlatform();
    setState(() {
      _version = info.version;
      _buildNumber = info.buildNumber;
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      // ...
      SliverToBoxAdapter(
        child: ListTile(
          title: const Text('App Version'),
          subtitle: Text('$_version ($_buildNumber)'),
        ),
      ),
    );
  }
}
```

**Verification**: Version appears in settings.

---

## Completion Checklist

- [ ] F01: web_builder_service.dart created
- [ ] F02: WebBuilderScreen wired to service
- [ ] F03: StreamingDebugService created
- [ ] F04: DebugAIService returns Stream<String>
- [ ] F05: DebugSessionService created
- [ ] F06: DebugSession model created
- [ ] F07: Auto-save after analysis completes
- [ ] F08: isAdmin added to SessionStore
- [ ] F09: Credits added to SessionStore with realtime
- [ ] F10: Provider/Riverpod unified (P2)
- [ ] F11: Sentry crash reporting (P2)
- [ ] F12: App version in settings (P2)

**Next tracks**: Track 5 (Flutter UI/UX) or Track 6 (Payments).
