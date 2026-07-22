import 'package:flutter/material.dart';
import '../services/trust_repository.dart';
import '../theme/app_colors.dart';

class UserFormScreen extends StatefulWidget {
  const UserFormScreen({
    required this.email,
    this.existingUser,
    required this.clients,
    required this.branches,
    super.key,
  });

  final String email;
  final Map<String, dynamic>? existingUser;
  final List<Map<String, dynamic>> clients;
  final List<Map<String, dynamic>> branches;

  @override
  State<UserFormScreen> createState() => _UserFormScreenState();
}

class _UserFormScreenState extends State<UserFormScreen> {
  final TrustRepository _repository = TrustRepository();
  final _formKey = GlobalKey<FormState>();

  late TextEditingController _nameController;
  late TextEditingController _emailController;
  late TextEditingController _passwordController;

  late String _selectedRole;
  late List<int> _selectedClientIds;
  late List<int> _selectedBranchIds;

  bool _isSaving = false;

  @override
  void initState() {
    super.initState();
    final user = widget.existingUser;
    _nameController = TextEditingController(text: user?['full_name'] as String? ?? '');
    _emailController = TextEditingController(text: user?['email'] as String? ?? '');
    _passwordController = TextEditingController();

    _selectedRole = user?['role'] as String? ?? 'inspector';
    _selectedClientIds = List<int>.from(user?['client_ids'] as List<dynamic>? ?? []);
    _selectedBranchIds = List<int>.from(user?['branch_ids'] as List<dynamic>? ?? []);
  }

  @override
  void dispose() {
    _nameController.dispose();
    _emailController.dispose();
    _passwordController.dispose();
    super.dispose();
  }

  Future<void> _save() async {
    if (!_formKey.currentState!.validate()) return;

    setState(() => _isSaving = true);

    try {
      final isEdit = widget.existingUser != null;
      if (isEdit) {
        final body = <String, dynamic>{
          'full_name': _nameController.text.trim(),
          'email': _emailController.text.trim(),
          'role': _selectedRole,
          'client_ids': _selectedClientIds,
          'branch_ids': _selectedBranchIds,
        };
        if (_passwordController.text.isNotEmpty) {
          body['password'] = _passwordController.text;
        }
        await _repository.updateUser(
          email: widget.email,
          userId: widget.existingUser!['id'] as int,
          body: body,
        );
      } else {
        await _repository.createUser(
          email: widget.email,
          fullName: _nameController.text.trim(),
          userEmail: _emailController.text.trim(),
          password: _passwordController.text,
          role: _selectedRole,
          clientIds: _selectedClientIds,
          branchIds: _selectedBranchIds,
        );
      }

      if (!mounted) return;
      Navigator.of(context).pop(true); // Return true to indicate successful save
    } catch (e) {
      setState(() => _isSaving = false);
      final errorMsg = e.toString().replaceFirst('Exception: ', '');
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(errorMsg),
          backgroundColor: AppColors.danger,
          behavior: SnackBarBehavior.floating,
        ),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final isEdit = widget.existingUser != null;

    return Scaffold(
      backgroundColor: Theme.of(context).scaffoldBackgroundColor,
      appBar: AppBar(
        title: Text(isEdit ? 'Editar Usuario' : 'Crear Usuario'),
        backgroundColor: Theme.of(context).scaffoldBackgroundColor,
        surfaceTintColor: Colors.transparent,
        elevation: 0,
        actions: [
          if (_isSaving)
            const Padding(
              padding: EdgeInsets.symmetric(horizontal: 16.0),
              child: SizedBox(
                width: 24,
                height: 24,
                child: CircularProgressIndicator(strokeWidth: 2),
              ),
            )
          else
            TextButton(
              onPressed: _save,
              child: Text(
                'Guardar',
                style: TextStyle(
                  color: isDark ? AppColors.yellow : AppColors.primary,
                  fontWeight: FontWeight.bold,
                  fontSize: 16,
                ),
              ),
            ),
        ],
      ),
      body: GestureDetector(
        onTap: () => FocusScope.of(context).unfocus(),
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(16.0),
          child: Form(
            key: _formKey,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                _buildSectionTitle('Información Básica'),
                const SizedBox(height: 12),
                TextFormField(
                  controller: _nameController,
                  decoration: InputDecoration(
                    labelText: 'Nombre Completo',
                    filled: true,
                    fillColor: isDark ? AppColors.darkSurface : AppColors.gray50,
                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                  ),
                  validator: (v) => v == null || v.trim().isEmpty ? 'El nombre es obligatorio' : null,
                ),
                const SizedBox(height: 16),
                TextFormField(
                  controller: _emailController,
                  decoration: InputDecoration(
                    labelText: 'Correo Electrónico',
                    filled: true,
                    fillColor: isDark ? AppColors.darkSurface : AppColors.gray50,
                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                  ),
                  keyboardType: TextInputType.emailAddress,
                  validator: (v) => v == null || v.trim().isEmpty ? 'El correo es obligatorio' : null,
                ),
                const SizedBox(height: 16),
                TextFormField(
                  controller: _passwordController,
                  decoration: InputDecoration(
                    labelText: 'Contraseña',
                    helperText: isEdit ? 'Dejar en blanco para conservar la actual' : 'Requerido para nuevos usuarios',
                    filled: true,
                    fillColor: isDark ? AppColors.darkSurface : AppColors.gray50,
                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                  ),
                  obscureText: true,
                  validator: (v) {
                    if (!isEdit && (v == null || v.isEmpty)) {
                      return 'La contraseña es obligatoria';
                    }
                    return null;
                  },
                ),
                const SizedBox(height: 24),
                _buildSectionTitle('Rol de Usuario'),
                const SizedBox(height: 12),
                DropdownButtonFormField<String>(
                  value: _selectedRole,
                  isExpanded: true,
                  decoration: InputDecoration(
                    filled: true,
                    fillColor: isDark ? AppColors.darkSurface : AppColors.gray50,
                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                  ),
                  items: const [
                    DropdownMenuItem(value: 'general_admin', child: Text('Administrador General')),
                    DropdownMenuItem(value: 'account_admin', child: Text('Administrador de Cuentas')),
                    DropdownMenuItem(value: 'branch_admin', child: Text('Administrador de Sucursal')),
                    DropdownMenuItem(value: 'inspector', child: Text('Inspector')),
                  ],
                  onChanged: (v) {
                    if (v != null) {
                      setState(() => _selectedRole = v);
                    }
                  },
                ),
                const SizedBox(height: 28),
                _buildSectionTitle('Clientes Asignados'),
                const SizedBox(height: 8),
                Card(
                  elevation: 0,
                  color: isDark ? AppColors.darkSurface : AppColors.gray50,
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(12),
                    side: BorderSide(color: Theme.of(context).dividerColor.withOpacity(0.08)),
                  ),
                  child: Padding(
                    padding: const EdgeInsets.all(8.0),
                    child: Column(
                      children: widget.clients.map((c) {
                        final cid = c['id'] as int;
                        final isSel = _selectedClientIds.contains(cid);
                        return CheckboxListTile(
                          title: Text(c['name'] as String? ?? ''),
                          value: isSel,
                          activeColor: AppColors.primary,
                          onChanged: (v) {
                            setState(() {
                              if (v == true) {
                                _selectedClientIds.add(cid);
                              } else {
                                _selectedClientIds.remove(cid);
                              }
                            });
                          },
                        );
                      }).toList(),
                    ),
                  ),
                ),
                const SizedBox(height: 28),
                _buildSectionTitle('Sucursales Asignadas'),
                const SizedBox(height: 8),
                Card(
                  elevation: 0,
                  color: isDark ? AppColors.darkSurface : AppColors.gray50,
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(12),
                    side: BorderSide(color: Theme.of(context).dividerColor.withOpacity(0.08)),
                  ),
                  child: Padding(
                    padding: const EdgeInsets.all(8.0),
                    child: Column(
                      children: widget.branches.map((b) {
                        final bid = b['id'] as int;
                        final isSel = _selectedBranchIds.contains(bid);
                        return CheckboxListTile(
                          title: Text(b['name'] as String? ?? ''),
                          subtitle: Text(b['client']?['name'] as String? ?? ''),
                          value: isSel,
                          activeColor: AppColors.primary,
                          onChanged: (v) {
                            setState(() {
                              if (v == true) {
                                _selectedBranchIds.add(bid);
                              } else {
                                _selectedBranchIds.remove(bid);
                              }
                            });
                          },
                        );
                      }).toList(),
                    ),
                  ),
                ),
                const SizedBox(height: 40),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildSectionTitle(String title) {
    return Text(
      title,
      style: const TextStyle(
        fontSize: 16,
        fontWeight: FontWeight.bold,
      ),
    );
  }
}
