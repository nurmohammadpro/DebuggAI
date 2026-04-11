---
name: frontend-design
description: DeBuggAI Flutter app UI/UX design system - colors, typography, components, spacing, theming, and patterns based on UI reference screenshots.
type: design
---

# DeBuggAI Frontend Design System

**Purpose**: Complete UI/UX design reference for DeBuggAI Flutter app based on production screenshots.

---

## Color Palette

### Primary Colors
```dart
class AppColors {
  // Primary - Mint Green
  static const Color primary = Color(0xFF4ADE80); // #4ADE80
  static const Color primaryDark = Color(0xFF22C55E); // Darker variant
  static const Color primaryLight = Color(0xFF86EFAC); // Lighter variant

  // Backgrounds
  static const Color background = Color(0xFF000000); // Pure black
  static const Color surface = Color(0xFF1A1A1A); // Dark gray for cards
  static const Color surfaceVariant = Color(0xFF262626); // Slightly lighter

  // Text
  static const Color textPrimary = Color(0xFFFFFFFF); // White
  static const Color textSecondary = Color(0xFF9CA3AF); // Light gray
  static const Color textTertiary = Color(0xFF6B7280); // Medium gray
  static const Color textDisabled = Color(0xFF404040); // Dark gray

  // Accents
  static const Color accentYellow = Color(0xFFFFC107); // Credits/warnings
  static const Color accentRed = Color(0xFFF44336); // Errors/bugs
  static const Color accentTeal = Color(0xFF009688); // Active states
  static const Color accentCyan = Color(0xFF06B6D4); // Info
  static const Color accentPurple = Color(0xFF8B5CF6); // Special features

  // Borders
  static const Color borderLight = Color(0xFF374151); // Light gray borders
  static const Color borderMedium = Color(0xFF4B5563); // Medium borders
  static const Color divider = Color(0xFF2D2D2D); // Subtle dividers

  // Semantic
  static const Color success = Color(0xFF4CAF50);
  static const Color warning = Color(0xFFFF9800);
  static const Color error = Color(0xFFEF4444);
  static const Color info = Color(0xFF3B82F6);
}
```

---

## Typography

### Font Family
```dart
class AppTypography {
  static const String fontFamily = 'Inter'; // Or 'SF Pro Display' on iOS

  // Font sizes
  static const double displayLarge = 32.0;
  static const double displayMedium = 28.0;
  static const double displaySmall = 24.0;
  static const double headlineLarge = 22.0;
  static const double headlineMedium = 20.0;
  static const double headlineSmall = 18.0;
  static const double titleLarge = 16.0;
  static const double titleMedium = 15.0;
  static const double titleSmall = 14.0;
  static const double bodyLarge = 16.0;
  static const double bodyMedium = 14.0;
  static const double bodySmall = 12.0;
  static const double labelLarge = 14.0;
  static const double labelMedium = 12.0;
  static const double labelSmall = 11.0;

  // Font weights
  static const FontWeight thin = FontWeight.w100;
  static const FontWeight extraLight = FontWeight.w200;
  static const FontWeight light = FontWeight.w300;
  static const FontWeight regular = FontWeight.w400;
  static const FontWeight medium = FontWeight.w500;
  static const FontWeight semiBold = FontWeight.w600;
  static const FontWeight bold = FontWeight.w700;
  static const FontWeight extraBold = FontWeight.w800;
}
```

### Text Styles
```dart
class AppTextStyles {
  // Display
  static const TextStyle displayLarge = TextStyle(
    fontSize: AppTypography.displayLarge,
    fontWeight: AppTypography.bold,
    color: AppColors.textPrimary,
    height: 1.2,
  );

  // Headlines
  static const TextStyle headlineMedium = TextStyle(
    fontSize: AppTypography.headlineMedium,
    fontWeight: AppTypography.semiBold,
    color: AppColors.textPrimary,
    height: 1.3,
  );

  // Body
  static const TextStyle bodyMedium = TextStyle(
    fontSize: AppTypography.bodyMedium,
    fontWeight: AppTypography.regular,
    color: AppColors.textSecondary,
    height: 1.5,
  );

  // Buttons
  static const TextStyle buttonLarge = TextStyle(
    fontSize: AppTypography.titleMedium,
    fontWeight: AppTypography.semiBold,
    color: AppColors.textPrimary,
    letterSpacing: 0.5,
  );

  // Captions
  static const TextStyle caption = TextStyle(
    fontSize: AppTypography.bodySmall,
    fontWeight: AppTypography.regular,
    color: AppColors.textTertiary,
  );
}
```

---

## Spacing System

```dart
class AppSpacing {
  // Base unit: 4px
  static const double unit = 4.0;

  // Spacing scale
  static const double xxs = 4.0;   // 1 unit
  static const double xs = 8.0;    // 2 units
  static const double sm = 12.0;   // 3 units
  static const double md = 16.0;   // 4 units
  static const double lg = 24.0;   // 6 units
  static const double xl = 32.0;   // 8 units
  static const double xxl = 48.0;  // 12 units
  static const double xxxl = 64.0; // 16 units

  // Component-specific
  static const double cardPadding = md;
  static const double screenPadding = md;
  static const double buttonPaddingV = sm;
  static const double buttonPaddingH = lg;
  static const double inputPadding = sm;
}
```

---

## Border Radius

```dart
class AppBorderRadius {
  static const double xs = 4.0;
  static const double sm = 6.0;
  static const double md = 8.0;
  static const double lg = 12.0;
  static const double xl = 16.0;
  static const double xxl = 24.0;
  static const double circle = 9999.0;

  // Component-specific
  static const double button = md;
  static const double card = lg;
  static const double input = sm;
  static const double chip = xl;
  static const double pill = circle;
}
```

---

## Component Patterns

### Buttons

**Primary Button**:
```dart
class AppPrimaryButton extends StatelessWidget {
  final String text;
  final VoidCallback? onPressed;
  final IconData? icon;
  final bool isLoading;

  @override
  Widget build(BuildContext context) {
    return ElevatedButton(
      onPressed: isLoading ? null : onPressed,
      style: ElevatedButton.styleFrom(
        backgroundColor: AppColors.primary,
        foregroundColor: Colors.black,
        padding: const EdgeInsets.symmetric(
          horizontal: AppSpacing.lg,
          vertical: AppSpacing.sm,
        ),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(AppBorderRadius.button),
        ),
        elevation: 0,
      ),
      child: isLoading
          ? const SizedBox(
              width: 16,
              height: 16,
              child: CircularProgressIndicator(strokeWidth: 2),
            )
          : Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                if (icon != null) ...[
                  Icon(icon, size: 18),
                  const SizedBox(width: AppSpacing.xs),
                ],
                Text(text, style: AppTextStyles.buttonLarge),
              ],
            ),
    );
  }
}
```

**Secondary Button**:
```dart
class AppSecondaryButton extends StatelessWidget {
  final String text;
  final VoidCallback? onPressed;
  final IconData? icon;

  @override
  Widget build(BuildContext context) {
    return OutlinedButton(
      onPressed: onPressed,
      style: OutlinedButton.styleFrom(
        foregroundColor: AppColors.textPrimary,
        side: const BorderSide(color: AppColors.borderLight),
        padding: const EdgeInsets.symmetric(
          horizontal: AppSpacing.lg,
          vertical: AppSpacing.sm,
        ),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(AppBorderRadius.button),
        ),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          if (icon != null) ...[
            Icon(icon, size: 18),
            const SizedBox(width: AppSpacing.xs),
          ],
          Text(text, style: AppTextStyles.buttonLarge),
        ],
      ),
    );
  }
}
```

### Cards

**Standard Card**:
```dart
class AppCard extends StatelessWidget {
  final Widget child;
  final EdgeInsetsGeometry? padding;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(AppBorderRadius.card),
        border: Border.all(color: AppColors.borderLight, width: 1),
      ),
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          onTap: onTap,
          borderRadius: BorderRadius.circular(AppBorderRadius.card),
          child: Padding(
            padding: padding ?? const EdgeInsets.all(AppSpacing.cardPadding),
            child: child,
          ),
        ),
      ),
    );
  }
}
```

**Gradient Card** (for primary actions):
```dart
class AppGradientCard extends StatelessWidget {
  final String title;
  final String? subtitle;
  final IconData icon;
  final VoidCallback? onAction;
  final String actionText;

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        gradient: const LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [
            Color(0xFF1B5E20),
            Color(0xFF2E7D32),
          ],
        ),
        borderRadius: BorderRadius.circular(AppBorderRadius.card),
      ),
      padding: const EdgeInsets.all(AppSpacing.lg),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(icon, color: AppColors.primary, size: 32),
          const SizedBox(height: AppSpacing.md),
          Text(
            title,
            style: AppTextStyles.headlineMedium,
          ),
          if (subtitle != null) ...[
            const SizedBox(height: AppSpacing.xs),
            Text(
              subtitle!,
              style: AppTextStyles.bodyMedium.copyWith(
                color: AppColors.textSecondary,
              ),
            ),
          ],
          const SizedBox(height: AppSpacing.md),
          AppPrimaryButton(
            text: actionText,
            onPressed: onAction,
          ),
        ],
      ),
    );
  }
}
```

### Stat Cards

```dart
class AppStatCard extends StatelessWidget {
  final String label;
  final String value;
  final IconData icon;
  final Color? iconColor;

  @override
  Widget build(BuildContext context) {
    return AppCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(
            icon,
            color: iconColor ?? AppColors.primary,
            size: 24,
          ),
          const SizedBox(height: AppSpacing.sm),
          Text(
            value,
            style: AppTextStyles.displaySmall.copyWith(
              fontWeight: AppTypography.bold,
            ),
          ),
          const SizedBox(height: AppSpacing.xs),
          Text(
            label,
            style: AppTextStyles.caption,
          ),
        ],
      ),
    );
  }
}
```

---

## Navigation Bar

```dart
class AppNavBar extends StatelessWidget implements PreferredSizeWidget {
  final int currentIndex;
  final ValueChanged<int> onTap;

  @override
  Size get preferredSize => const Size.fromHeight(60);

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: const BoxDecoration(
        color: AppColors.background,
        border: Border(
          bottom: BorderSide(color: AppColors.borderLight, width: 1),
        ),
      ),
      child: SafeArea(
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: AppSpacing.md),
          child: Row(
            children: [
              // Logo
              const Text(
                'DeBuggAI',
                style: TextStyle(
                  fontSize: 20,
                  fontWeight: AppTypography.bold,
                  color: AppColors.textPrimary,
                ),
              ),

              const Spacer(),

              // Nav items
              ..._buildNavItems(),

              const SizedBox(width: AppSpacing.md),

              // Actions
              _buildActions(context),
            ],
          ),
        ),
      ),
    );
  }

  List<Widget> _buildNavItems() {
    final items = ['Home', 'Services', 'Pricing', 'About'];

    return List.generate(items.length, (index) {
      final isActive = index == currentIndex;
      return Padding(
        padding: const EdgeInsets.symmetric(horizontal: AppSpacing.xs),
        child: TextButton(
          onPressed: () => onTap(index),
          style: TextButton.styleFrom(
            backgroundColor: isActive ? AppColors.primary : Colors.transparent,
            foregroundColor: isActive ? Colors.black : AppColors.textPrimary,
            padding: const EdgeInsets.symmetric(
              horizontal: AppSpacing.md,
              vertical: AppSpacing.xs,
            ),
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(AppBorderRadius.button),
            ),
          ),
          child: Text(items[index]),
        ),
      );
    });
  }

  Widget _buildActions(BuildContext context) {
    return Row(
      children: [
        // Notification bell
        IconButton(
          icon: const Icon(Icons.notifications_outlined),
          color: AppColors.textSecondary,
          onPressed: () {},
        ),

        // Sign in
        TextButton(
          onPressed: () {},
          child: const Text('Sign In'),
        ),

        // Get started
        AppPrimaryButton(
          text: 'Get Started',
          onPressed: () {},
        ),
      ],
    );
  }
}
```

---

## Bottom Navigation (Mobile)

```dart
class AppBottomNav extends StatelessWidget {
  final int currentIndex;
  final ValueChanged<int> onTap;

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: const BoxDecoration(
        color: AppColors.surface,
        border: Border(
          top: BorderSide(color: AppColors.borderLight, width: 1),
        ),
      ),
      child: SafeArea(
        child: SizedBox(
          height: 60,
          child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceAround,
            children: [
              _buildNavItem(Icons.home, 'Home', 0),
              _buildNavItem(Icons.bug_report, 'Debug', 1),
              _buildNavItem(Icons.web, 'Web Builder', 2),
              _buildNavItem(Icons.folder_open, 'Exports', 3),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildNavItem(IconData icon, String label, int index) {
    final isActive = index == currentIndex;
    return InkWell(
      onTap: () => onTap(index),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(
            icon,
            color: isActive ? AppColors.primary : AppColors.textSecondary,
          ),
          const SizedBox(height: 4),
          Text(
            label,
            style: TextStyle(
              fontSize: 10,
              color: isActive ? AppColors.primary : AppColors.textSecondary,
              fontWeight: isActive ? AppTypography.semiBold : AppTypography.regular,
            ),
          ),
        ],
      ),
    );
  }
}
```

---

## Input Fields

```dart
class AppTextField extends StatelessWidget {
  final String? label;
  final String? hint;
  final TextEditingController? controller;
  final bool obscureText;
  final IconData? prefixIcon;
  final Widget? suffixIcon;
  final String? errorText;
  final int maxLines;

  @override
  Widget build(BuildContext context) {
    return TextField(
      controller: controller,
      obscureText: obscureText,
      maxLines: maxLines ?? 1,
      style: AppTextStyles.bodyMedium.copyWith(
        color: AppColors.textPrimary,
      ),
      decoration: InputDecoration(
        labelText: label,
        hintText: hint,
        errorText: errorText,
        prefixIcon: prefixIcon != null ? Icon(prefixIcon) : null,
        suffixIcon: suffixIcon,
        filled: true,
        fillColor: AppColors.surfaceVariant,
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(AppBorderRadius.input),
          borderSide: const BorderSide(color: AppColors.borderLight),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(AppBorderRadius.input),
          borderSide: const BorderSide(color: AppColors.borderLight),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(AppBorderRadius.input),
          borderSide: const BorderSide(color: AppColors.primary, width: 2),
        ),
        errorBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(AppBorderRadius.input),
          borderSide: const BorderSide(color: AppColors.error),
        ),
        labelStyle: AppTextStyles.bodyMedium.copyWith(
          color: AppColors.textSecondary,
        ),
        hintStyle: AppTextStyles.bodyMedium.copyWith(
          color: AppColors.textTertiary,
        ),
        contentPadding: const EdgeInsets.all(AppSpacing.inputPadding),
      ),
    );
  }
}
```

---

## Loading States

### Skeleton Loader
```dart
class AppSkeletonLoader extends StatefulWidget {
  final double? width;
  final double? height;
  final BorderRadius? borderRadius;

  @override
  State<AppSkeletonLoader> createState() => _AppSkeletonLoaderState();
}

class _AppSkeletonLoaderState extends State<AppSkeletonLoader>
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
          width: widget.width,
          height: widget.height,
          decoration: BoxDecoration(
            gradient: LinearGradient(
              begin: Alignment.centerLeft,
              end: Alignment.centerRight,
              colors: [
                AppColors.surfaceVariant,
                AppColors.surface,
                AppColors.surfaceVariant,
              ],
              stops: [
                0.0,
                0.5 + _animation.value * 0.1,
                1.0,
              ],
            ),
            borderRadius: widget.radiusBorder ??
                BorderRadius.circular(AppBorderRadius.card),
          ),
        );
      },
    );
  }
}
```

---

## Empty States

```dart
class AppEmptyState extends StatelessWidget {
  final IconData icon;
  final String title;
  final String? message;
  final String? actionText;
  final VoidCallback? onAction;

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(AppSpacing.xl),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(
              icon,
              size: 64,
              color: AppColors.textTertiary,
            ),
            const SizedBox(height: AppSpacing.md),
            Text(
              title,
              style: AppTextStyles.headlineMedium,
              textAlign: TextAlign.center,
            ),
            if (message != null) ...[
              const SizedBox(height: AppSpacing.sm),
              Text(
                message!,
                style: AppTextStyles.bodyMedium.copyWith(
                  color: AppColors.textSecondary,
                ),
                textAlign: TextAlign.center,
              ),
            ],
            if (actionText != null) ...[
              const SizedBox(height: AppSpacing.lg),
              AppPrimaryButton(
                text: actionText!,
                onPressed: onAction,
              ),
            ],
          ],
        ),
      ),
    );
  }
}
```

---

## Theme Data

```dart
class AppTheme {
  static ThemeData get lightTheme {
    return ThemeData(
      useMaterial3: true,
      brightness: Brightness.dark,
      colorScheme: const ColorScheme.dark(
        primary: AppColors.primary,
        onPrimary: Colors.black,
        surface: AppColors.surface,
        onSurface: AppColors.textPrimary,
        error: AppColors.error,
        onError: Colors.white,
      ),
      scaffoldBackgroundColor: AppColors.background,
      appBarTheme: const AppBarTheme(
        backgroundColor: AppColors.background,
        foregroundColor: AppColors.textPrimary,
        elevation: 0,
        centerTitle: false,
      ),
      cardTheme: CardTheme(
        color: AppColors.surface,
        elevation: 0,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(AppBorderRadius.card),
          side: const BorderSide(color: AppColors.borderLight),
        ),
      ),
      elevatedButtonTheme: ElevatedButtonThemeData(
        style: ElevatedButton.styleFrom(
          backgroundColor: AppColors.primary,
          foregroundColor: Colors.black,
          elevation: 0,
          padding: const EdgeInsets.symmetric(
            horizontal: AppSpacing.lg,
            vertical: AppSpacing.sm,
          ),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(AppBorderRadius.button),
          ),
        ),
      ),
      outlinedButtonTheme: OutlinedButtonThemeData(
        style: OutlinedButton.styleFrom(
          foregroundColor: AppColors.textPrimary,
          side: const BorderSide(color: AppColors.borderLight),
          padding: const EdgeInsets.symmetric(
            horizontal: AppSpacing.lg,
            vertical: AppSpacing.sm,
          ),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(AppBorderRadius.button),
          ),
        ),
      ),
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: AppColors.surfaceVariant,
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(AppBorderRadius.input),
          borderSide: const BorderSide(color: AppColors.borderLight),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(AppBorderRadius.input),
          borderSide: const BorderSide(color: AppColors.borderLight),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(AppBorderRadius.input),
          borderSide: const BorderSide(color: AppColors.primary, width: 2),
        ),
        contentPadding: const EdgeInsets.all(AppSpacing.inputPadding),
      ),
      textTheme: TextTheme(
        displayLarge: AppTextStyles.displayLarge,
        displayMedium: AppTextStyles.displayMedium,
        displaySmall: AppTextStyles.displaySmall,
        headlineMedium: AppTextStyles.headlineMedium,
        titleMedium: AppTextStyles.titleMedium,
        bodyMedium: AppTextStyles.bodyMedium,
        bodySmall: AppTextStyles.bodySmall,
        labelSmall: AppTextStyles.caption,
      ),
    );
  }
}
```

---

## Icons

### Icon Usage
- Use `Icons` from Material Design for consistency
- Size: 16px (small), 24px (regular), 32px (large), 48px (xlarge)
- Colors: Primary accent, semantic colors, or text colors

### Common Icon Mappings
```dart
class AppIcons {
  // Navigation
  static const IconData home = Icons.home_outlined;
  static const IconData services = Icons.grid_view_outlined;
  static const IconData pricing = Icons.payments_outlined;
  static const IconData about = Icons.info_outlined;
  static const IconData settings = Icons.settings_outlined;
  static const IconData profile = Icons.person_outlined;

  // Actions
  static const IconData debug = Icons.bug_report_outlined;
  static const IconData code = Icons.code_outlined;
  static const IconData web = Icons.web_outlined;
  static const IconData export = Icons.download_outlined;
  static const IconData share = Icons.share_outlined;
  static const IconData copy = Icons.copy_outlined;

  // Status
  static const IconData success = Icons.check_circle_outline;
  static const IconData error = Icons.error_outline;
  static const IconData warning = Icons.warning_amber_outlined;
  static const IconData info = Icons.info_outline;

  // Features
  static const IconData credits = Icons.bolt_outlined;
  static const IconData users = Icons.people_outline;
  static const IconData referrals = Icons.card_giftcard_outlined;
  static const IconData notifications = Icons.notifications_outlined;
}
```

---

## Responsive Breakpoints

```dart
class AppBreakpoints {
  static const double mobile = 600;
  static const double tablet = 900;
  static const double desktop = 1200;

  static bool isMobile(BuildContext context) =>
      MediaQuery.of(context).size.width < mobile;

  static bool isTablet(BuildContext context) =>
      MediaQuery.of(context).size.width >= mobile &&
      MediaQuery.of(context).size.width < tablet;

  static bool isDesktop(BuildContext context) =>
      MediaQuery.of(context).size.width >= tablet;
}
```

---

## Animations

### Duration
```dart
class AppDurations {
  static const Duration fast = Duration(milliseconds: 150);
  static const Duration normal = Duration(milliseconds: 300);
  static const Duration slow = Duration(milliseconds: 500);
  static const Duration slower = Duration(milliseconds: 800);
}
```

### Curves
```dart
class AppCurves {
  static const Curve easeIn = Curves.easeIn;
  static const Curve easeOut = Curves.easeOut;
  static const Curve easeInOut = Curves.easeInOut;
  static const Curve fastOutSlowIn = Curves.fastOutSlowIn;
}
```

---

## File Structure Reference

```
lib/
├── main.dart
├── app.dart
├── theme/
│   ├── app_colors.dart
│   ├── app_typography.dart
│   ├── app_spacing.dart
│   └── app_theme.dart
├── common_widgets/
│   ├── app_card.dart
│   ├── app_button.dart
│   ├── app_text_field.dart
│   ├── app_skeleton_loader.dart
│   └── app_empty_state.dart
├── features/
│   ├── home/
│   │   └── home_screen.dart
│   ├── debugger/
│   │   └── debug_builder_screen.dart
│   ├── web_builder/
│   │   └── web_builder_screen.dart
│   ├── pricing/
│   │   └── pricing_page.dart
│   ├── referrals/
│   │   └── referral_dashboard.dart
│   └── settings/
│       └── settings_screen.dart
└── core/
    ├── app_router.dart
    └── app_scaffold.dart
```

This design system ensures consistency across the entire DeBuggAI application while maintaining a modern, professional appearance suitable for a developer tool.
