import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:local_auth/local_auth.dart';
import 'package:url_launcher/url_launcher.dart';

import 'home_screen.dart';
import '../services/trust_repository.dart';
import '../theme/app_colors.dart';
import '../models/user_role.dart';
import '../services/push_notification_service.dart';

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
  static const _biometricEnabledKey = 'biometric_enabled';
  static const _biometricEmailKey = 'biometric_email';
  static const _biometricPasswordKey = 'biometric_password';

  final _emailController = TextEditingController();
  final _passwordController = TextEditingController();
  final _formKey = GlobalKey<FormState>();
  final _repository = TrustRepository();
  final _secureStorage = const FlutterSecureStorage();
  final _localAuth = LocalAuthentication();

  bool _isSubmitting = false;
  bool _isBiometricLoading = true;
  bool _isBiometricLoginEnabled = false;

  @override
  void initState() {
    super.initState();
    _loadBiometricStatus();
  }

  @override
  void dispose() {
    _emailController.dispose();
    _passwordController.dispose();
    super.dispose();
  }

  Future<void> _loadBiometricStatus() async {
    final enabled = await _secureStorage.read(key: _biometricEnabledKey);
    final storedEmail = await _secureStorage.read(key: _biometricEmailKey);
    final storedPassword = await _secureStorage.read(key: _biometricPasswordKey);
    if (!mounted) {
      return;
    }
    setState(() {
      _isBiometricLoginEnabled =
          enabled == 'true' &&
          (storedEmail?.isNotEmpty ?? false) &&
          (storedPassword?.isNotEmpty ?? false);
      _isBiometricLoading = false;
      if (_isBiometricLoginEnabled && storedEmail != null) {
        _emailController.text = storedEmail;
      }
    });
  }


  Future<String?> _safeFcmToken() async {
    return PushNotificationService.instance.getToken();
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate() || _isSubmitting) {
      return;
    }

    setState(() => _isSubmitting = true);
    final email = _emailController.text.trim();

    try {
      final fcmToken = await _safeFcmToken();
      final response = await _repository.login(
        email: email,
        password: _passwordController.text,
        fcmToken: fcmToken,
        deviceType: 'android',
      );
      final user = response['user'] as Map<String, dynamic>?;
      final resolvedEmail = (user?['email'] as String?)?.trim();
      final resolvedRole = UserRoleParsing.fromBackendRole(user?['role'] as String?);

      if (!mounted) {
        return;
      }

      final finalEmail = (resolvedEmail == null || resolvedEmail.isEmpty) ? email : resolvedEmail;
      await _promptEnableBiometricLoginIfNeeded(
        email: finalEmail,
        password: _passwordController.text,
      );
      if (!mounted) {
        return;
      }
      _goToHome(email: finalEmail, role: resolvedRole);
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

  Future<void> _loginWithBiometrics() async {
    if (_isSubmitting || !_isBiometricLoginEnabled) {
      return;
    }
    setState(() => _isSubmitting = true);
    try {
      final canAuthenticate =
          await _localAuth.canCheckBiometrics || await _localAuth.isDeviceSupported();
      if (!canAuthenticate) {
        throw Exception('Este dispositivo no soporta autenticación biométrica.');
      }

      final didAuthenticate = await _localAuth.authenticate(
        localizedReason: 'Usa tu Face ID o huella para iniciar sesión',
        options: const AuthenticationOptions(
          biometricOnly: true,
          stickyAuth: true,
        ),
      );

      if (!didAuthenticate) {
        return;
      }

      final storedEmail = await _secureStorage.read(key: _biometricEmailKey);
      final storedPassword = await _secureStorage.read(key: _biometricPasswordKey);
      if (storedEmail == null || storedPassword == null) {
        throw Exception('No hay credenciales biométricas guardadas.');
      }

      final fcmToken = await _safeFcmToken();
      final response = await _repository.login(
        email: storedEmail,
        password: storedPassword,
        fcmToken: fcmToken,
        deviceType: 'android',
      );
      final user = response['user'] as Map<String, dynamic>?;
      final resolvedEmail = (user?['email'] as String?)?.trim();
      final resolvedRole = UserRoleParsing.fromBackendRole(user?['role'] as String?);
      final finalEmail =
          (resolvedEmail == null || resolvedEmail.isEmpty) ? storedEmail : resolvedEmail;

      if (!mounted) {
        return;
      }
      _goToHome(email: finalEmail, role: resolvedRole);
    } on PlatformException catch (error) {
      if (!mounted) {
        return;
      }
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(error.message ?? 'No se pudo validar tu biometría.')),
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

  Future<void> _promptEnableBiometricLoginIfNeeded({
    required String email,
    required String password,
  }) async {
    if (_isBiometricLoginEnabled) {
      return;
    }

    final canAuthenticate =
        await _localAuth.canCheckBiometrics || await _localAuth.isDeviceSupported();
    if (!canAuthenticate || !mounted) {
      return;
    }

    final shouldEnable = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Activar inicio biométrico'),
        content: const Text(
          '¿Deseas activar el inicio de sesión con Face ID o huella para próximos accesos?',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(false),
            child: const Text('Ahora no'),
          ),
          FilledButton(
            onPressed: () => Navigator.of(context).pop(true),
            child: const Text('Activar'),
          ),
        ],
      ),
    );

    if (shouldEnable != true) {
      return;
    }

    final didAuthenticate = await _localAuth.authenticate(
      localizedReason: 'Confirma tu identidad para activar biometría',
      options: const AuthenticationOptions(
        biometricOnly: true,
        stickyAuth: true,
      ),
    );

    if (!didAuthenticate) {
      return;
    }

    await _secureStorage.write(key: _biometricEnabledKey, value: 'true');
    await _secureStorage.write(key: _biometricEmailKey, value: email);
    await _secureStorage.write(key: _biometricPasswordKey, value: password);

    if (!mounted) {
      return;
    }

    setState(() => _isBiometricLoginEnabled = true);
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(content: Text('Inicio biométrico activado.')),
    );
  }

  void _goToHome({required String email, required UserRole role}) {
    Navigator.of(context).pushReplacement(
      MaterialPageRoute<void>(
        builder: (_) => HomeScreen(
          email: email,
          role: role,
          isDarkMode: widget.isDarkMode,
          onToggleThemeMode: widget.onToggleThemeMode,
        ),
      ),
    );
  }


  Future<void> _openExternalUrl(String url, String errorMessage) async {
    final uri = Uri.parse(url);
    if (!await launchUrl(uri, mode: LaunchMode.externalApplication) && mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(errorMessage)),
      );
    }
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
                        Center(
                          child: Image.asset(
                            'assets/icon/trust_logo_s.png',
                            height: 83.2,
                          ),
                        ),
                        const SizedBox(height: 14),
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
                                    borderSide: const BorderSide(color: AppColors.primary, width: 1.8),
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
                                    borderSide: const BorderSide(color: AppColors.primary, width: 1.8),
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
                                  backgroundColor: AppColors.secondary,
                                  disabledBackgroundColor: AppColors.secondaryDark,
                                  overlayColor: AppColors.secondaryDark,
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
                              const SizedBox(height: 10),
                              OutlinedButton.icon(
                                onPressed: (_isSubmitting ||
                                        _isBiometricLoading ||
                                        !_isBiometricLoginEnabled)
                                    ? null
                                    : _loginWithBiometrics,
                                icon: const Icon(Icons.fingerprint_rounded),
                                label: const Text('Iniciar con datos biométricos'),
                                style: OutlinedButton.styleFrom(
                                  minimumSize: const Size.fromHeight(50),
                                  textStyle: const TextStyle(
                                    fontSize: 15,
                                    fontWeight: FontWeight.w700,
                                  ),
                                ),
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
                                  color: AppColors.primary,
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
                                  color: AppColors.primary,
                                  fontWeight: FontWeight.w700,
                                  fontSize: 12,
                                ),
                              ),
                            ),
                          ],
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
