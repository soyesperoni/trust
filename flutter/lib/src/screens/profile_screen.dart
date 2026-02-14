import 'package:flutter/material.dart';

import '../services/trust_repository.dart';
import '../theme/app_colors.dart';

class ProfileScreen extends StatefulWidget {
  const ProfileScreen({
    required this.email,
    super.key,
  });

  final String email;

  @override
  State<ProfileScreen> createState() => _ProfileScreenState();
}

class _ProfileScreenState extends State<ProfileScreen> {
  final _repository = TrustRepository();
  final _formKey = GlobalKey<FormState>();

  late final TextEditingController _fullNameController;
  late final TextEditingController _emailController;
  final TextEditingController _currentPasswordController = TextEditingController();
  final TextEditingController _newPasswordController = TextEditingController();
  final TextEditingController _confirmPasswordController = TextEditingController();

  bool _loading = true;
  bool _saving = false;
  String? _error;
  int? _userId;

  @override
  void initState() {
    super.initState();
    _fullNameController = TextEditingController();
    _emailController = TextEditingController(text: widget.email);
    _loadProfile();
  }

  @override
  void dispose() {
    _fullNameController.dispose();
    _emailController.dispose();
    _currentPasswordController.dispose();
    _newPasswordController.dispose();
    _confirmPasswordController.dispose();
    super.dispose();
  }

  Future<void> _loadProfile() async {
    setState(() {
      _loading = true;
      _error = null;
    });

    try {
      final user = await _repository.loadCurrentUser(widget.email);
      if (!mounted) return;

      final fullName = (user['full_name'] as String?)?.trim() ?? '';
      final email = (user['email'] as String?)?.trim() ?? widget.email;

      setState(() {
        _userId = user['id'] as int?;
        _fullNameController.text = fullName.isEmpty ? _guessFullName(email) : fullName;
        _emailController.text = email;
        _loading = false;
      });
    } catch (error) {
      if (!mounted) return;
      setState(() {
        _fullNameController.text = _guessFullName(widget.email);
        _error = error.toString().replaceFirst('Exception: ', '');
        _loading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final backgroundColor = Theme.of(context).scaffoldBackgroundColor;

    return Scaffold(
      backgroundColor: backgroundColor,
      appBar: AppBar(
        backgroundColor: backgroundColor,
        surfaceTintColor: Colors.transparent,
        elevation: 0,
        scrolledUnderElevation: 0,
        leading: IconButton(
          onPressed: () => Navigator.of(context).pop(),
          icon: const Icon(Icons.arrow_back),
        ),
        title: const Text(
          'Mi Perfil',
          style: TextStyle(fontWeight: FontWeight.w600),
        ),
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : SafeArea(
              child: SingleChildScrollView(
                padding: const EdgeInsets.fromLTRB(20, 8, 20, 24),
                child: Column(
                  children: [
                    const SizedBox(height: 20),
                    CircleAvatar(
                      radius: 56,
                      backgroundColor: AppColors.yellow,
                      child: Text(
                        _initials(_fullNameController.text),
                        style: const TextStyle(
                          color: AppColors.black,
                          fontSize: 38,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                    ),
                    const SizedBox(height: 12),
                    Text(
                      _fullNameController.text,
                      style: TextStyle(
                        fontSize: 20,
                        fontWeight: FontWeight.w700,
                        color: Theme.of(context).colorScheme.onSurface,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      _emailController.text,
                      style: TextStyle(
                        fontSize: 13,
                        color: isDark ? AppColors.darkMuted : const Color(0xFF64748B),
                      ),
                    ),
                    const SizedBox(height: 24),
                    ConstrainedBox(
                      constraints: const BoxConstraints(maxWidth: 460),
                      child: Form(
                        key: _formKey,
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.stretch,
                          children: [
                            if (_error != null)
                              _StatusCard(
                                message: _error!,
                                isError: true,
                              ),
                            Text(
                              'Datos del usuario',
                              style: TextStyle(
                                fontSize: 13,
                                fontWeight: FontWeight.w700,
                                color: isDark ? AppColors.darkMuted : const Color(0xFF334155),
                              ),
                            ),
                            const SizedBox(height: 10),
                            _ProfileField(
                              controller: _fullNameController,
                              label: 'Nombre completo',
                              keyboardType: TextInputType.name,
                              enabled: !_saving,
                            ),
                            const SizedBox(height: 12),
                            _ProfileField(
                              controller: _emailController,
                              label: 'Correo electrónico',
                              keyboardType: TextInputType.emailAddress,
                              enabled: false,
                            ),
                            const SizedBox(height: 24),
                            Text(
                              'Cambiar contraseña',
                              style: TextStyle(
                                fontSize: 13,
                                fontWeight: FontWeight.w700,
                                color: isDark ? AppColors.darkMuted : const Color(0xFF334155),
                              ),
                            ),
                            const SizedBox(height: 10),
                            _ProfileField(
                              controller: _currentPasswordController,
                              label: 'Contraseña actual',
                              obscureText: true,
                              enabled: !_saving,
                            ),
                            const SizedBox(height: 12),
                            _ProfileField(
                              controller: _newPasswordController,
                              label: 'Nueva contraseña',
                              obscureText: true,
                              enabled: !_saving,
                            ),
                            const SizedBox(height: 12),
                            _ProfileField(
                              controller: _confirmPasswordController,
                              label: 'Confirmar nueva contraseña',
                              obscureText: true,
                              enabled: !_saving,
                            ),
                            const SizedBox(height: 28),
                            Row(
                              children: [
                                Expanded(
                                  child: OutlinedButton(
                                    onPressed: _saving ? null : () => Navigator.of(context).pop(),
                                    child: const Text('Cancelar'),
                                  ),
                                ),
                                const SizedBox(width: 8),
                                Expanded(
                                  child: FilledButton.icon(
                                    onPressed: _saving ? null : _saveProfile,
                                    icon: const Icon(Icons.save_outlined, size: 20),
                                    label: Text(_saving ? 'Guardando...' : 'Guardar cambios'),
                                    style: FilledButton.styleFrom(
                                      backgroundColor: AppColors.yellow,
                                      foregroundColor: AppColors.black,
                                      textStyle: const TextStyle(fontWeight: FontWeight.w700),
                                      minimumSize: const Size.fromHeight(48),
                                    ),
                                  ),
                                ),
                              ],
                            ),
                          ],
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ),
    );
  }

  Future<void> _saveProfile() async {
    final fullName = _fullNameController.text.trim();
    final currentPassword = _currentPasswordController.text;
    final newPassword = _newPasswordController.text;
    final confirmPassword = _confirmPasswordController.text;

    if (fullName.isEmpty) {
      _showMessage('Ingresa tu nombre completo.', isError: true);
      return;
    }

    final wantsPasswordChange =
        currentPassword.isNotEmpty || newPassword.isNotEmpty || confirmPassword.isNotEmpty;

    if (wantsPasswordChange &&
        (currentPassword.isEmpty || newPassword.isEmpty || confirmPassword.isEmpty)) {
      _showMessage('Completa todos los campos de contraseña.', isError: true);
      return;
    }

    if (wantsPasswordChange && newPassword.length < 8) {
      _showMessage('La nueva contraseña debe tener al menos 8 caracteres.', isError: true);
      return;
    }

    if (wantsPasswordChange && newPassword != confirmPassword) {
      _showMessage('La confirmación no coincide con la nueva contraseña.', isError: true);
      return;
    }

    if (_userId == null) {
      _showMessage('No se pudo identificar el usuario actual.', isError: true);
      return;
    }

    setState(() {
      _saving = true;
      _error = null;
    });

    try {
      if (wantsPasswordChange) {
        await _repository.login(email: _emailController.text.trim(), password: currentPassword);
      }

      final response = await _repository.updateUserProfile(
        currentEmail: widget.email,
        userId: _userId!,
        fullName: fullName,
        password: wantsPasswordChange ? newPassword : null,
      );

      if (!mounted) return;

      _fullNameController.text = (response['full_name'] as String?)?.trim().isNotEmpty == true
          ? (response['full_name'] as String).trim()
          : fullName;

      _currentPasswordController.clear();
      _newPasswordController.clear();
      _confirmPasswordController.clear();

      _showMessage('Perfil actualizado correctamente.');
    } catch (error) {
      if (!mounted) return;
      _showMessage(error.toString().replaceFirst('Exception: ', ''), isError: true);
    } finally {
      if (mounted) {
        setState(() => _saving = false);
      }
    }
  }

  void _showMessage(String message, {bool isError = false}) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(message),
        backgroundColor: isError ? const Color(0xFFB91C1C) : const Color(0xFF166534),
      ),
    );
  }

  static String _guessFullName(String email) {
    final username = email.split('@').first;
    final chunks = username.split(RegExp(r'[._-]+')).where((chunk) => chunk.isNotEmpty);
    if (chunks.isEmpty) {
      return 'Usuario Trust';
    }
    return chunks.map((chunk) => chunk[0].toUpperCase() + chunk.substring(1).toLowerCase()).join(' ');
  }

  static String _initials(String fullName) {
    final parts = fullName.split(' ').where((part) => part.trim().isNotEmpty).toList();
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    if (parts.isNotEmpty && parts.first.length > 1) {
      return parts.first.substring(0, 2).toUpperCase();
    }
    return 'TR';
  }
}

class _StatusCard extends StatelessWidget {
  const _StatusCard({
    required this.message,
    this.isError = false,
  });

  final String message;
  final bool isError;

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Container(
      width: double.infinity,
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: isError
            ? (isDark ? const Color(0xFF3F1D1D) : const Color(0xFFFEF2F2))
            : (isDark ? const Color(0xFF052E20) : const Color(0xFFF0FDF4)),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
          color: isError ? const Color(0xFFFECACA) : const Color(0xFFBBF7D0),
        ),
      ),
      child: Text(
        message,
        style: TextStyle(
          color: isError ? const Color(0xFFB91C1C) : const Color(0xFF166534),
          fontSize: 13,
        ),
      ),
    );
  }
}

class _ProfileField extends StatelessWidget {
  const _ProfileField({
    required this.controller,
    required this.label,
    this.keyboardType,
    this.obscureText = false,
    this.enabled = true,
  });

  final TextEditingController controller;
  final String label;
  final TextInputType? keyboardType;
  final bool obscureText;
  final bool enabled;

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return TextField(
      controller: controller,
      keyboardType: keyboardType,
      obscureText: obscureText,
      enabled: enabled,
      decoration: InputDecoration(
        labelText: label,
        labelStyle: TextStyle(color: isDark ? AppColors.darkMuted : const Color(0xFF334155), fontWeight: FontWeight.w600),
        filled: true,
        fillColor: isDark ? AppColors.darkCard : Colors.white,
        contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 14),
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: BorderSide(color: isDark ? AppColors.darkCardBorder : const Color(0xFFD1D5DB)),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: BorderSide(color: isDark ? AppColors.darkCardBorder : const Color(0xFFD1D5DB)),
        ),
        disabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: BorderSide(color: isDark ? AppColors.darkCardBorder : const Color(0xFFE5E7EB)),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: const BorderSide(color: AppColors.yellow, width: 1.8),
        ),
      ),
    );
  }
}
