import 'package:flutter/material.dart';
import '../services/trust_repository.dart';
import '../theme/app_colors.dart';

class AreaFormScreen extends StatefulWidget {
  const AreaFormScreen({
    required this.email,
    this.existingArea,
    required this.branches,
    super.key,
  });

  final String email;
  final Map<String, dynamic>? existingArea;
  final List<Map<String, dynamic>> branches;

  @override
  State<AreaFormScreen> createState() => _AreaFormScreenState();
}

class _AreaFormScreenState extends State<AreaFormScreen> {
  final TrustRepository _repository = TrustRepository();
  final _formKey = GlobalKey<FormState>();

  late TextEditingController _nameController;
  late TextEditingController _descController;

  late int _selectedBranchId;
  bool _isSaving = false;

  @override
  void initState() {
    super.initState();
    final area = widget.existingArea;
    _nameController = TextEditingController(text: area?['name'] as String? ?? '');
    _descController = TextEditingController(text: area?['description'] as String? ?? '');

    if (widget.branches.isNotEmpty) {
      _selectedBranchId = area?['branch']?['id'] as int? ?? widget.branches.first['id'] as int;
    }
  }

  @override
  void dispose() {
    _nameController.dispose();
    _descController.dispose();
    super.dispose();
  }

  Future<void> _save() async {
    if (widget.branches.isEmpty) return;
    if (!_formKey.currentState!.validate()) return;

    setState(() => _isSaving = true);

    try {
      final isEdit = widget.existingArea != null;
      if (isEdit) {
        await _repository.updateArea(
          email: widget.email,
          areaId: widget.existingArea!['id'] as int,
          body: {
            'branch_id': _selectedBranchId,
            'name': _nameController.text.trim(),
            'description': _descController.text.trim(),
          },
        );
      } else {
        await _repository.createArea(
          email: widget.email,
          branchId: _selectedBranchId,
          name: _nameController.text.trim(),
          description: _descController.text.trim(),
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
    final isEdit = widget.existingArea != null;

    return Scaffold(
      backgroundColor: Theme.of(context).scaffoldBackgroundColor,
      appBar: AppBar(
        title: Text(isEdit ? 'Editar Área' : 'Crear Área'),
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
      body: widget.branches.isEmpty
          ? Center(
              child: Padding(
                padding: const EdgeInsets.all(24.0),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    const Icon(Icons.warning_amber_rounded, size: 64, color: Colors.orange),
                    const SizedBox(height: 16),
                    const Text(
                      'Debes crear al menos una Sucursal antes de agregar áreas.',
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
                      _buildSectionTitle('Información del Área'),
                      const SizedBox(height: 12),
                      DropdownButtonFormField<int>(
                        value: _selectedBranchId,
                        isExpanded: true,
                        decoration: InputDecoration(
                          labelText: 'Sucursal',
                          filled: true,
                          fillColor: isDark ? AppColors.darkSurface : AppColors.gray50,
                          border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                        ),
                        items: widget.branches.map((b) {
                          return DropdownMenuItem<int>(
                            value: b['id'] as int,
                            child: Text(
                              '${b['name']} (${b['client']?['name'] ?? ''})',
                              overflow: TextOverflow.ellipsis,
                            ),
                          );
                        }).toList(),
                        onChanged: (v) {
                          if (v != null) {
                            setState(() => _selectedBranchId = v);
                          }
                        },
                      ),
                      const SizedBox(height: 16),
                      TextFormField(
                        controller: _nameController,
                        decoration: InputDecoration(
                          labelText: 'Nombre del Área',
                          filled: true,
                          fillColor: isDark ? AppColors.darkSurface : AppColors.gray50,
                          border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                        ),
                        validator: (v) => v == null || v.trim().isEmpty ? 'El nombre es obligatorio' : null,
                      ),
                      const SizedBox(height: 16),
                      TextFormField(
                        controller: _descController,
                        decoration: InputDecoration(
                          labelText: 'Descripción',
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
