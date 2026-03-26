import 'package:flutter/material.dart';

import '../services/trust_repository.dart';
import '../theme/app_colors.dart';

class DashboardQuickUserScreen extends StatefulWidget {
  const DashboardQuickUserScreen({
    required this.email,
    super.key,
  });

  final String email;

  @override
  State<DashboardQuickUserScreen> createState() => _DashboardQuickUserScreenState();
}

class _DashboardQuickUserScreenState extends State<DashboardQuickUserScreen> {
  final TrustRepository _repository = TrustRepository();
  final GlobalKey<FormState> _formKey = GlobalKey<FormState>();

  final TextEditingController _nameController = TextEditingController();
  final TextEditingController _emailController = TextEditingController();
  final TextEditingController _passwordController = TextEditingController();

  bool _loadingCatalogs = true;
  bool _saving = false;
  String? _error;

  _RoleOption _selectedRole = _RoleOption.inspector;
  int? _selectedClientId;
  int? _selectedBranchId;

  List<Map<String, dynamic>> _clients = const [];
  List<Map<String, dynamic>> _branches = const [];

  @override
  void initState() {
    super.initState();
    _loadCatalogs();
  }

  @override
  void dispose() {
    _nameController.dispose();
    _emailController.dispose();
    _passwordController.dispose();
    super.dispose();
  }

  Future<void> _loadCatalogs() async {
    setState(() {
      _loadingCatalogs = true;
      _error = null;
    });

    try {
      final results = await Future.wait([
        _repository.loadClients(widget.email),
        _repository.loadBranches(widget.email),
      ]);

      if (!mounted) {
        return;
      }

      setState(() {
        _clients = results[0];
        _branches = results[1];
        _loadingCatalogs = false;
      });
    } catch (error) {
      if (!mounted) {
        return;
      }
      setState(() {
        _loadingCatalogs = false;
        _error = error.toString();
      });
    }
  }

  bool get _requiresClient => _selectedRole == _RoleOption.accountAdmin;

  bool get _requiresBranch =>
      _selectedRole == _RoleOption.branchAdmin || _selectedRole == _RoleOption.inspector;

  Future<void> _submit() async {
    if (!(_formKey.currentState?.validate() ?? false)) {
      return;
    }

    if (_requiresClient && _selectedClientId == null) {
      setState(() => _error = 'Selecciona una cuenta (cliente).');
      return;
    }

    if (_requiresBranch && _selectedBranchId == null) {
      setState(() => _error = 'Selecciona una sucursal.');
      return;
    }

    setState(() {
      _saving = true;
      _error = null;
    });

    try {
      await _repository.createUser(
        email: widget.email,
        fullName: _nameController.text.trim(),
        userEmail: _emailController.text.trim(),
        password: _passwordController.text,
        role: _selectedRole.backendValue,
        clientIds: _requiresClient ? <int>[_selectedClientId!] : const [],
        branchIds: _requiresBranch ? <int>[_selectedBranchId!] : const [],
      );

      if (!mounted) {
        return;
      }

      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Usuario creado correctamente.')),
      );
      Navigator.of(context).pop(true);
    } catch (error) {
      if (!mounted) {
        return;
      }
      setState(() => _error = error.toString());
    } finally {
      if (mounted) {
        setState(() => _saving = false);
      }
    }
  }

  InputDecoration _inputDecoration(BuildContext context, String label) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    return InputDecoration(
      labelText: label,
      labelStyle: TextStyle(color: isDark ? AppColors.darkMuted : const Color(0xFF334155)),
      filled: true,
      fillColor: isDark ? AppColors.darkCard : Colors.white,
      border: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: BorderSide(color: isDark ? AppColors.darkCardBorder : const Color(0xFFD1D5DB)),
      ),
      enabledBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: BorderSide(color: isDark ? AppColors.darkCardBorder : const Color(0xFFD1D5DB)),
      ),
      focusedBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: const BorderSide(color: AppColors.secondary, width: 1.8),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Alta rápida de usuario')),
      body: _loadingCatalogs
          ? const Center(child: CircularProgressIndicator())
          : SafeArea(
              child: SingleChildScrollView(
                padding: const EdgeInsets.all(16),
                child: Form(
                  key: _formKey,
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      TextFormField(
                        controller: _nameController,
                        decoration: _inputDecoration(context, 'Nombre completo'),
                        textInputAction: TextInputAction.next,
                        validator: (value) => (value == null || value.trim().isEmpty)
                            ? 'Ingresa el nombre del usuario.'
                            : null,
                      ),
                      const SizedBox(height: 12),
                      TextFormField(
                        controller: _emailController,
                        decoration: _inputDecoration(context, 'Correo'),
                        keyboardType: TextInputType.emailAddress,
                        textInputAction: TextInputAction.next,
                        validator: (value) {
                          final normalized = value?.trim() ?? '';
                          if (normalized.isEmpty) {
                            return 'Ingresa el correo del usuario.';
                          }
                          if (!normalized.contains('@')) {
                            return 'Ingresa un correo válido.';
                          }
                          return null;
                        },
                      ),
                      const SizedBox(height: 12),
                      TextFormField(
                        controller: _passwordController,
                        decoration: _inputDecoration(context, 'Contraseña'),
                        obscureText: true,
                        validator: (value) {
                          if ((value ?? '').isEmpty) {
                            return 'Ingresa una contraseña.';
                          }
                          if ((value ?? '').length < 6) {
                            return 'Mínimo 6 caracteres.';
                          }
                          return null;
                        },
                      ),
                      const SizedBox(height: 14),
                      DropdownButtonFormField<_RoleOption>(
                        value: _selectedRole,
                        decoration: _inputDecoration(context, 'Rol'),
                        items: _RoleOption.values
                            .map(
                              (role) => DropdownMenuItem<_RoleOption>(
                                value: role,
                                child: Text(role.label),
                              ),
                            )
                            .toList(growable: false),
                        onChanged: (value) {
                          if (value == null) {
                            return;
                          }
                          setState(() {
                            _selectedRole = value;
                            _selectedClientId = null;
                            _selectedBranchId = null;
                            _error = null;
                          });
                        },
                      ),
                      if (_requiresClient) ...[
                        const SizedBox(height: 12),
                        DropdownButtonFormField<int>(
                          value: _selectedClientId,
                          decoration: _inputDecoration(context, 'Cuenta (cliente)'),
                          items: _clients
                              .map(
                                (client) => DropdownMenuItem<int>(
                                  value: client['id'] as int?,
                                  child: Text((client['name'] as String?) ?? 'Sin nombre'),
                                ),
                              )
                              .toList(growable: false),
                          onChanged: (value) => setState(() => _selectedClientId = value),
                        ),
                      ],
                      if (_requiresBranch) ...[
                        const SizedBox(height: 12),
                        DropdownButtonFormField<int>(
                          value: _selectedBranchId,
                          decoration: _inputDecoration(context, 'Sucursal'),
                          items: _branches
                              .map(
                                (branch) => DropdownMenuItem<int>(
                                  value: branch['id'] as int?,
                                  child: Text((branch['name'] as String?) ?? 'Sin nombre'),
                                ),
                              )
                              .toList(growable: false),
                          onChanged: (value) => setState(() => _selectedBranchId = value),
                        ),
                      ],
                      if (_error != null) ...[
                        const SizedBox(height: 12),
                        Text(
                          _error!,
                          style: TextStyle(color: Theme.of(context).colorScheme.error),
                        ),
                      ],
                      const SizedBox(height: 18),
                      SizedBox(
                        height: 54,
                        child: FilledButton(
                          onPressed: _saving ? null : _submit,
                          style: FilledButton.styleFrom(
                            backgroundColor: AppColors.secondary,
                            foregroundColor: Colors.white,
                          ),
                          child: _saving
                              ? const SizedBox(
                                  width: 18,
                                  height: 18,
                                  child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                                )
                              : const Text('Crear usuario'),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ),
    );
  }
}

enum _RoleOption {
  inspector('Inspector', 'inspector'),
  branchAdmin('Administrador de sucursal', 'branch_admin'),
  accountAdmin('Administrador de cuenta', 'account_admin');

  const _RoleOption(this.label, this.backendValue);

  final String label;
  final String backendValue;
}
