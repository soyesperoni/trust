import 'package:flutter/material.dart';
import '../services/trust_repository.dart';
import '../theme/app_colors.dart';

class BranchFormScreen extends StatefulWidget {
  const BranchFormScreen({
    required this.email,
    this.existingBranch,
    required this.clients,
    super.key,
  });

  final String email;
  final Map<String, dynamic>? existingBranch;
  final List<Map<String, dynamic>> clients;

  @override
  State<BranchFormScreen> createState() => _BranchFormScreenState();
}

class _BranchFormScreenState extends State<BranchFormScreen> {
  final TrustRepository _repository = TrustRepository();
  final _formKey = GlobalKey<FormState>();

  late TextEditingController _nameController;
  late TextEditingController _addressController;
  late TextEditingController _cityController;

  late int _selectedClientId;
  bool _isSaving = false;

  @override
  void initState() {
    super.initState();
    final branch = widget.existingBranch;
    _nameController = TextEditingController(text: branch?['name'] as String? ?? '');
    _addressController = TextEditingController(text: branch?['address'] as String? ?? '');
    _cityController = TextEditingController(text: branch?['city'] as String? ?? '');

    if (widget.clients.isNotEmpty) {
      _selectedClientId = branch?['client']?['id'] as int? ?? widget.clients.first['id'] as int;
    }
  }

  @override
  void dispose() {
    _nameController.dispose();
    _addressController.dispose();
    _cityController.dispose();
    super.dispose();
  }

  Future<void> _save() async {
    if (widget.clients.isEmpty) return;
    if (!_formKey.currentState!.validate()) return;

    setState(() => _isSaving = true);

    try {
      final isEdit = widget.existingBranch != null;
      if (isEdit) {
        await _repository.updateBranch(
          email: widget.email,
          branchId: widget.existingBranch!['id'] as int,
          body: {
            'client_id': _selectedClientId,
            'name': _nameController.text.trim(),
            'address': _addressController.text.trim(),
            'city': _cityController.text.trim(),
          },
        );
      } else {
        await _repository.createBranch(
          email: widget.email,
          clientId: _selectedClientId,
          name: _nameController.text.trim(),
          address: _addressController.text.trim(),
          city: _cityController.text.trim(),
        );
      }

      if (!mounted) return;
      Navigator.of(context).pop(true);
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
    final isEdit = widget.existingBranch != null;

    return Scaffold(
      backgroundColor: Theme.of(context).scaffoldBackgroundColor,
      appBar: AppBar(
        title: Text(isEdit ? 'Editar Sucursal' : 'Crear Sucursal'),
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
      body: widget.clients.isEmpty
          ? Center(
              child: Padding(
                padding: const EdgeInsets.all(24.0),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    const Icon(Icons.warning_amber_rounded, size: 64, color: Colors.orange),
                    const SizedBox(height: 16),
                    const Text(
                      'Debes crear al menos un Cliente antes de agregar sucursales.',
                      textAlign: TextAlign.center,
                      style: TextStyle(fontSize: 16),
                    ),
                    const SizedBox(height: 24),
                    FilledButton(
                      onPressed: () => Navigator.of(context).pop(),
                      style: FilledButton.styleFrom(backgroundColor: AppColors.primary),
                      child: const Text('Volver'),
                    ),
                  ],
                ),
              ),
            )
          : GestureDetector(
              onTap: () => FocusScope.of(context).unfocus(),
              child: SingleChildScrollView(
                padding: const EdgeInsets.all(16.0),
                child: Form(
                  key: _formKey,
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      _buildSectionTitle('Información de la Sucursal'),
                      const SizedBox(height: 12),
                      DropdownButtonFormField<int>(
                        value: _selectedClientId,
                        isExpanded: true,
                        decoration: InputDecoration(
                          labelText: 'Cliente',
                          filled: true,
                          fillColor: isDark ? AppColors.darkSurface : AppColors.gray50,
                          border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                        ),
                        items: widget.clients.map((c) {
                          return DropdownMenuItem<int>(
                            value: c['id'] as int,
                            child: Text(
                              c['name'] as String? ?? '',
                              overflow: TextOverflow.ellipsis,
                            ),
                          );
                        }).toList(),
                        onChanged: (v) {
                          if (v != null) {
                            setState(() => _selectedClientId = v);
                          }
                        },
                      ),
                      const SizedBox(height: 16),
                      TextFormField(
                        controller: _nameController,
                        decoration: InputDecoration(
                          labelText: 'Nombre de la Sucursal',
                          filled: true,
                          fillColor: isDark ? AppColors.darkSurface : AppColors.gray50,
                          border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                        ),
                        validator: (v) => v == null || v.trim().isEmpty ? 'El nombre es obligatorio' : null,
                      ),
                      const SizedBox(height: 16),
                      TextFormField(
                        controller: _addressController,
                        decoration: InputDecoration(
                          labelText: 'Dirección',
                          filled: true,
                          fillColor: isDark ? AppColors.darkSurface : AppColors.gray50,
                          border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                        ),
                      ),
                      const SizedBox(height: 16),
                      TextFormField(
                        controller: _cityController,
                        decoration: InputDecoration(
                          labelText: 'Ciudad',
                          filled: true,
                          fillColor: isDark ? AppColors.darkSurface : AppColors.gray50,
                          border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
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
