import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:url_launcher/url_launcher.dart';

import 'home_screen.dart';
import '../services/trust_repository.dart';
import '../theme/app_colors.dart';
import '../models/user_role.dart';

class LoginScreen extends StatefulWidget {
  const LoginScreen({
    required this.isDarkMode,
    required this.onToggleThemeMode,
    super.key,
  });

  final bool isDarkMode;
  final VoidCallback onToggleThemeMode;

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final _emailController = TextEditingController();
  final _passwordController = TextEditingController();
  final _formKey = GlobalKey<FormState>();
  final _repository = TrustRepository();

  bool _isSubmitting = false;

  @override
  void dispose() {
    _emailController.dispose();
    _passwordController.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate() || _isSubmitting) {
      return;
    }

    setState(() => _isSubmitting = true);
    final email = _emailController.text.trim();

    try {
      final response = await _repository.login(
        email: email,
        password: _passwordController.text,
      );
      final user = response['user'] as Map<String, dynamic>?;
      final resolvedEmail = (user?['email'] as String?)?.trim();
      final resolvedRole = UserRoleParsing.fromBackendRole(user?['role'] as String?);

      if (!mounted) {
        return;
      }

      Navigator.of(context).pushReplacement(
        MaterialPageRoute<void>(
          builder: (_) => HomeScreen(
            email: (resolvedEmail == null || resolvedEmail.isEmpty) ? email : resolvedEmail,
            role: resolvedRole,
            isDarkMode: widget.isDarkMode,
            onToggleThemeMode: widget.onToggleThemeMode,
          ),
        ),
      );
    } catch (error) {
      if (!mounted) {
        return;
      }
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(error.toString().replaceFirst('Exception: ', ''))),
      );
    } finally {
      if (mounted) {
        setState(() => _isSubmitting = false);
      }
    }
  }


  Future<void> _openExternalUrl(String url, String errorMessage) async {
    final uri = Uri.parse(url);
    if (!await launchUrl(uri, mode: LaunchMode.externalApplication) && mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(errorMessage)),
      );
    }
  }

  Future<void> _openSupplyMaxUrl() async {
    await _openExternalUrl('https://supplymax.net/', 'No se pudo abrir SupplyMax.');
  }

  Future<void> _openPrivacyPolicyUrl() async {
    await _openExternalUrl(
      'https://trust.supplymax.net/politica-privacidad',
      'No se pudo abrir la Política de Privacidad.',
    );
  }

  Future<void> _openTermsUrl() async {
    await _openExternalUrl(
      'https://trust.supplymax.net/terminos-condiciones',
      'No se pudieron abrir los Términos y Condiciones.',
    );
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final background = Theme.of(context).scaffoldBackgroundColor;
    final onSurface = Theme.of(context).colorScheme.onSurface;
    final mutedTextColor = isDark ? AppColors.darkMuted : const Color(0xFF64748B);

    return Scaffold(
      backgroundColor: background,
      body: SafeArea(
        child: LayoutBuilder(
          builder: (context, constraints) => SingleChildScrollView(
            padding: const EdgeInsets.fromLTRB(20, 16, 20, 24),
            child: ConstrainedBox(
              constraints: BoxConstraints(minHeight: constraints.maxHeight - 40),
              child: Center(
                child: ConstrainedBox(
                  constraints: const BoxConstraints(maxWidth: 460),
                  child: Form(
                    key: _formKey,
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      crossAxisAlignment: CrossAxisAlignment.stretch,
                      children: [
                        Text(
                          'trust',
                          textAlign: TextAlign.center,
                          style: GoogleFonts.poppins(
                            color: AppColors.yellow,
                            fontWeight: FontWeight.w700,
                            fontSize: 58,
                            letterSpacing: -1,
                          ),
                        ),
                        const SizedBox(height: 6),
                        Center(
                          child: GestureDetector(
                            onTap: _openSupplyMaxUrl,
                            child: Row(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                Text(
                                  'by',
                                  style: TextStyle(
                                    color: mutedTextColor,
                                    fontSize: 13,
                                    fontWeight: FontWeight.w600,
                                  ),
                                ),
                                const SizedBox(width: 8),
                                Image.network(
                                  'https://trust.supplymax.net/supply.png',
                                  height: 24,
                                  errorBuilder: (_, __, ___) => const SizedBox.shrink(),
                                ),
                              ],
                            ),
                          ),
                        ),
                        const SizedBox(height: 10),
                        Text(
                          'Accede a tu cuenta',
                          textAlign: TextAlign.center,
                          style: TextStyle(
                            fontSize: 14,
                            fontWeight: FontWeight.w500,
                            color: mutedTextColor,
                          ),
                        ),
                        const SizedBox(height: 28),
                        Container(
                          padding: const EdgeInsets.all(16),
                          decoration: BoxDecoration(
                            color: isDark ? AppColors.darkCard : Colors.white,
                            borderRadius: BorderRadius.circular(16),
                            border: Border.all(
                              color: isDark ? AppColors.darkCardBorder : const Color(0xFFE2E8F0),
                            ),
                          ),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.stretch,
                            children: [
                              TextFormField(
                                controller: _emailController,
                                keyboardType: TextInputType.emailAddress,
                                decoration: InputDecoration(
                                  labelText: 'Correo electrónico',
                                  hintText: 'Correo electrónico',
                                  labelStyle: TextStyle(
                                    color: isDark ? AppColors.darkMuted : const Color(0xFF334155),
                                    fontWeight: FontWeight.w600,
                                  ),
                                  filled: true,
                                  fillColor: isDark ? AppColors.darkSurface : Colors.white,
                                  contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 14),
                                  border: OutlineInputBorder(
                                    borderRadius: BorderRadius.circular(12),
                                    borderSide: BorderSide(
                                      color: isDark ? AppColors.darkCardBorder : const Color(0xFFD1D5DB),
                                    ),
                                  ),
                                  enabledBorder: OutlineInputBorder(
                                    borderRadius: BorderRadius.circular(12),
                                    borderSide: BorderSide(
                                      color: isDark ? AppColors.darkCardBorder : const Color(0xFFD1D5DB),
                                    ),
                                  ),
                                  focusedBorder: OutlineInputBorder(
                                    borderRadius: BorderRadius.circular(12),
                                    borderSide: const BorderSide(color: AppColors.yellow, width: 1.8),
                                  ),
                                ),
                                style: TextStyle(color: onSurface, fontSize: 16),
                                validator: (value) {
                                  if (value == null || value.trim().isEmpty) {
                                    return 'Ingresa tu correo electrónico';
                                  }
                                  if (!RegExp(r'^[^\s@]+@[^\s@]+\.[^\s@]+$').hasMatch(value.trim())) {
                                    return 'Ingresa un correo válido';
                                  }
                                  return null;
                                },
                              ),
                              const SizedBox(height: 12),
                              TextFormField(
                                controller: _passwordController,
                                obscureText: true,
                                decoration: InputDecoration(
                                  labelText: 'Contraseña',
                                  hintText: 'Contraseña',
                                  labelStyle: TextStyle(
                                    color: isDark ? AppColors.darkMuted : const Color(0xFF334155),
                                    fontWeight: FontWeight.w600,
                                  ),
                                  filled: true,
                                  fillColor: isDark ? AppColors.darkSurface : Colors.white,
                                  contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 14),
                                  border: OutlineInputBorder(
                                    borderRadius: BorderRadius.circular(12),
                                    borderSide: BorderSide(
                                      color: isDark ? AppColors.darkCardBorder : const Color(0xFFD1D5DB),
                                    ),
                                  ),
                                  enabledBorder: OutlineInputBorder(
                                    borderRadius: BorderRadius.circular(12),
                                    borderSide: BorderSide(
                                      color: isDark ? AppColors.darkCardBorder : const Color(0xFFD1D5DB),
                                    ),
                                  ),
                                  focusedBorder: OutlineInputBorder(
                                    borderRadius: BorderRadius.circular(12),
                                    borderSide: const BorderSide(color: AppColors.yellow, width: 1.8),
                                  ),
                                ),
                                style: TextStyle(color: onSurface, fontSize: 16),
                                validator: (value) {
                                  if (value == null || value.isEmpty) {
                                    return 'Ingresa tu contraseña';
                                  }
                                  return null;
                                },
                              ),
                              const SizedBox(height: 20),
                              FilledButton(
                                onPressed: _isSubmitting ? null : _submit,
                                style: FilledButton.styleFrom(
                                  backgroundColor: AppColors.yellow,
                                  disabledBackgroundColor: const Color(0xFFFFE680),
                                  foregroundColor: AppColors.black,
                                  minimumSize: const Size.fromHeight(50),
                                  textStyle: const TextStyle(
                                    fontSize: 17,
                                    fontWeight: FontWeight.w700,
                                  ),
                                ),
                                child: _isSubmitting
                                    ? const SizedBox(
                                        width: 22,
                                        height: 22,
                                        child: CircularProgressIndicator(
                                          strokeWidth: 2.4,
                                          valueColor: AlwaysStoppedAnimation<Color>(Color(0xFF111827)),
                                        ),
                                      )
                                    : const Text('Iniciar sesión'),
                              ),
                            ],
                          ),
                        ),
                        const SizedBox(height: 18),
                        Wrap(
                          alignment: WrapAlignment.center,
                          crossAxisAlignment: WrapCrossAlignment.center,
                          spacing: 6,
                          runSpacing: 4,
                          children: [
                            Text(
                              'Al continuar aceptas',
                              style: TextStyle(
                                color: mutedTextColor,
                                fontSize: 12,
                                fontWeight: FontWeight.w500,
                              ),
                            ),
                            GestureDetector(
                              onTap: _openTermsUrl,
                              child: const Text(
                                'Términos y Condiciones',
                                style: TextStyle(
                                  color: AppColors.yellow,
                                  fontWeight: FontWeight.w700,
                                  fontSize: 12,
                                ),
                              ),
                            ),
                            Text(
                              'y',
                              style: TextStyle(
                                color: mutedTextColor,
                                fontSize: 12,
                                fontWeight: FontWeight.w500,
                              ),
                            ),
                            GestureDetector(
                              onTap: _openPrivacyPolicyUrl,
                              child: const Text(
                                'Política de Privacidad',
                                style: TextStyle(
                                  color: AppColors.yellow,
                                  fontWeight: FontWeight.w700,
                                  fontSize: 12,
                                ),
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 12),
                        Center(
                          child: GestureDetector(
                            onTap: _openSupplyMaxUrl,
                            child: Row(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                Text(
                                  'by',
                                  style: TextStyle(
                                    color: mutedTextColor,
                                    fontSize: 13,
                                    fontWeight: FontWeight.w600,
                                  ),
                                ),
                                const SizedBox(width: 8),
                                Image.network(
                                  'https://trust.supplymax.net/supply.png',
                                  height: 22,
                                  errorBuilder: (_, __, ___) => const SizedBox.shrink(),
                                ),
                              ],
                            ),
                          ),
                        ),

                      ],
                    ),
                  ),
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}
