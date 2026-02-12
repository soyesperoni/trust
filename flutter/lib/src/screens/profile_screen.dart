import 'package:flutter/material.dart';

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
  late final TextEditingController _fullNameController;
  late final TextEditingController _emailController;
  final TextEditingController _currentPasswordController = TextEditingController();
  final TextEditingController _newPasswordController = TextEditingController();
  final TextEditingController _confirmPasswordController = TextEditingController();

  @override
  void initState() {
    super.initState();
    _fullNameController = TextEditingController(text: _guessFullName(widget.email));
    _emailController = TextEditingController(text: widget.email);
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

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;

    return Scaffold(
      backgroundColor: colorScheme.surface,
      appBar: AppBar(
        backgroundColor: colorScheme.surface,
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
      body: SafeArea(
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
                    color: Colors.white,
                    fontSize: 38,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ),
              const SizedBox(height: 32),
              ConstrainedBox(
                constraints: const BoxConstraints(maxWidth: 460),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    _ProfileField(
                      controller: _fullNameController,
                      label: 'Nombre completo',
                      keyboardType: TextInputType.name,
                    ),
                    const SizedBox(height: 12),
                    _ProfileField(
                      controller: _emailController,
                      label: 'Correo electrónico',
                      keyboardType: TextInputType.emailAddress,
                    ),
                    const SizedBox(height: 28),
                    Text(
                      'Cambiar contraseña',
                      style: TextStyle(
                        fontSize: 13,
                        fontWeight: FontWeight.w600,
                        color: colorScheme.onSurfaceVariant,
                      ),
                    ),
                    const SizedBox(height: 12),
                    _ProfileField(
                      controller: _currentPasswordController,
                      label: 'Contraseña actual',
                      obscureText: true,
                    ),
                    const SizedBox(height: 12),
                    _ProfileField(
                      controller: _newPasswordController,
                      label: 'Nueva contraseña',
                      obscureText: true,
                    ),
                    const SizedBox(height: 12),
                    _ProfileField(
                      controller: _confirmPasswordController,
                      label: 'Confirmar nueva contraseña',
                      obscureText: true,
                    ),
                    const SizedBox(height: 36),
                    FilledButton.icon(
                      onPressed: _saveProfile,
                      icon: const Icon(Icons.save_outlined, size: 20),
                      label: const Text('Guardar cambios'),
                      style: FilledButton.styleFrom(
                        backgroundColor: AppColors.yellow,
                        foregroundColor: AppColors.black,
                        textStyle: const TextStyle(fontWeight: FontWeight.w700),
                        minimumSize: const Size.fromHeight(48),
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  void _saveProfile() {
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(content: Text('Cambios guardados correctamente')),
    );
  }

  static String _guessFullName(String email) {
    final username = email.split('@').first;
    final chunks = username.split(RegExp(r'[._-]+')).where((chunk) => chunk.isNotEmpty);
    if (chunks.isEmpty) {
      return 'Usuario Trust';
    }
    return chunks
        .map((chunk) => chunk[0].toUpperCase() + chunk.substring(1).toLowerCase())
        .join(' ');
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

class _ProfileField extends StatelessWidget {
  const _ProfileField({
    required this.controller,
    required this.label,
    this.keyboardType,
    this.obscureText = false,
  });

  final TextEditingController controller;
  final String label;
  final TextInputType? keyboardType;
  final bool obscureText;

  @override
  Widget build(BuildContext context) {
    return TextField(
      controller: controller,
      keyboardType: keyboardType,
      obscureText: obscureText,
      decoration: InputDecoration(
        labelText: label,
        filled: true,
        fillColor: Theme.of(context).brightness == Brightness.dark
            ? AppColors.charcoal
            : const Color(0xFFF3F4F6),
        border: const OutlineInputBorder(
          borderRadius: BorderRadius.only(
            topLeft: Radius.circular(12),
            topRight: Radius.circular(12),
          ),
          borderSide: BorderSide.none,
        ),
        enabledBorder: const UnderlineInputBorder(
          borderSide: BorderSide(color: Color(0xFF9CA3AF)),
        ),
        focusedBorder: const UnderlineInputBorder(
          borderSide: BorderSide(color: Color(0xFFF57F17), width: 1.5),
        ),
      ),
    );
  }
}
