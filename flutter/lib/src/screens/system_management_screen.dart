import 'package:flutter/material.dart';

import '../services/trust_repository.dart';
import '../theme/app_colors.dart';

class SystemManagementScreen extends StatefulWidget {
  const SystemManagementScreen({
    required this.email,
    required this.isDarkMode,
    super.key,
  });

  final String email;
  final bool isDarkMode;

  @override
  State<SystemManagementScreen> createState() => _SystemManagementScreenState();
}

class _SystemManagementScreenState extends State<SystemManagementScreen> with SingleTickerProviderStateMixin {
  final TrustRepository _repository = TrustRepository();
  late TabController _tabController;

  bool _isLoading = true;
  String? _errorMessage;

  // Catalogs
  List<Map<String, dynamic>> _users = [];
  List<Map<String, dynamic>> _clients = [];
  List<Map<String, dynamic>> _branches = [];
  List<Map<String, dynamic>> _areas = [];
  List<Map<String, dynamic>> _dispensers = [];
  List<Map<String, dynamic>> _products = [];
  List<Map<String, dynamic>> _dispenserModels = [];

  // Filter queries
  String _userSearch = '';
  String _clientSearch = '';
  String _branchSearch = '';
  String _areaSearch = '';
  String _dispenserSearch = '';
  String _productSearch = '';

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 6, vsync: this);
    _loadAllData();
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  Future<void> _loadAllData() async {
    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    try {
      final results = await Future.wait([
        _repository.loadUsers(widget.email),
        _repository.loadClients(widget.email),
        _repository.loadBranches(widget.email),
        _repository.loadAreas(widget.email),
        _repository.loadDispensers(widget.email),
        _repository.loadProducts(widget.email),
        _repository.loadDispenserModels(widget.email),
      ]);

      if (!mounted) return;

      setState(() {
        _users = results[0];
        _clients = results[1];
        _branches = results[2];
        _areas = results[3];
        _dispensers = results[4];
        _products = results[5];
        _dispenserModels = results[6];
        _isLoading = false;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _errorMessage = e.toString().replaceFirst('Exception: ', '');
        _isLoading = false;
      });
    }
  }

  void _showErrorSnackBar(Object error) {
    final message = error.toString().replaceFirst('Exception: ', '');
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(message),
        backgroundColor: AppColors.danger,
        behavior: SnackBarBehavior.floating,
      ),
    );
  }

  void _showSuccessSnackBar(String message) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(message),
        backgroundColor: AppColors.secondary,
        behavior: SnackBarBehavior.floating,
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Scaffold(
      backgroundColor: Theme.of(context).scaffoldBackgroundColor,
      appBar: AppBar(
        title: const Text(
          'Administración del Sistema',
          style: TextStyle(fontWeight: FontWeight.bold, fontSize: 20),
        ),
        backgroundColor: Theme.of(context).scaffoldBackgroundColor,
        surfaceTintColor: Colors.transparent,
        elevation: 0,
        bottom: TabBar(
          controller: _tabController,
          isScrollable: true,
          labelColor: isDark ? AppColors.yellow : AppColors.primary,
          unselectedLabelColor: isDark ? AppColors.darkMuted : AppColors.gray500,
          indicatorColor: isDark ? AppColors.yellow : AppColors.primary,
          tabs: const [
            Tab(text: 'Usuarios'),
            Tab(text: 'Clientes'),
            Tab(text: 'Sucursales'),
            Tab(text: 'Áreas'),
            Tab(text: 'Dosificadores'),
            Tab(text: 'Productos'),
          ],
        ),
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : _errorMessage != null
              ? Center(
                  child: Padding(
                    padding: const EdgeInsets.all(24.0),
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Icon(Icons.error_outline_rounded, size: 64, color: AppColors.danger),
                        const SizedBox(height: 16),
                        Text(
                          _errorMessage!,
                          textAlign: TextAlign.center,
                          style: const TextStyle(fontSize: 16),
                        ),
                        const SizedBox(height: 24),
                        FilledButton.icon(
                          onPressed: _loadAllData,
                          icon: const Icon(Icons.refresh_rounded),
                          label: const Text('Reintentar'),
                          style: FilledButton.styleFrom(backgroundColor: AppColors.primary),
                        ),
                      ],
                    ),
                  ),
                )
              : TabBarView(
                  controller: _tabController,
                  children: [
                    _buildUsersTab(),
                    _buildClientsTab(),
                    _buildBranchesTab(),
                    _buildAreasTab(),
                    _buildDispensersTab(),
                    _buildProductsTab(),
                  ],
                ),
    );
  }

  // Helper Widget for search bar
  Widget _buildSearchBar({
    required String hintText,
    required ValueChanged<String> onChanged,
  }) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    return Padding(
      padding: const EdgeInsets.all(12.0),
      child: TextField(
        onChanged: onChanged,
        decoration: InputDecoration(
          hintText: hintText,
          prefixIcon: const Icon(Icons.search_rounded),
          filled: true,
          fillColor: isDark ? AppColors.darkSurface : AppColors.gray100,
          contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
          border: OutlineInputBorder(
            borderRadius: BorderRadius.circular(12),
            borderSide: BorderSide.none,
          ),
        ),
      ),
    );
  }

  // Helper dialog/confirm builder for deletion
  Future<bool> _confirmDeletion(String itemName) async {
    final confirm = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('¿Eliminar elemento?'),
        content: Text('¿Estás seguro de que deseas eliminar "$itemName"? Esta acción no se puede deshacer.'),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(false),
            child: const Text('Cancelar'),
          ),
          FilledButton(
            onPressed: () => Navigator.of(context).pop(true),
            style: FilledButton.styleFrom(backgroundColor: AppColors.danger),
            child: const Text('Eliminar'),
          ),
        ],
      ),
    );
    return confirm ?? false;
  }

  // ==========================================
  // TAB: USUARIOS
  // ==========================================
  Widget _buildUsersTab() {
    final filtered = _users.where((u) {
      final name = (u['full_name'] as String? ?? '').toLowerCase();
      final email = (u['email'] as String? ?? '').toLowerCase();
      final query = _userSearch.toLowerCase();
      return name.contains(query) || email.contains(query);
    }).toList();

    return Scaffold(
      floatingActionButton: FloatingActionButton(
        onPressed: () => _openUserFormDialog(null),
        backgroundColor: AppColors.primary,
        child: const Icon(Icons.add_rounded, color: Colors.white),
      ),
      body: Column(
        children: [
          _buildSearchBar(
            hintText: 'Buscar usuarios...',
            onChanged: (val) => setState(() => _userSearch = val),
          ),
          Expanded(
            child: ListView.builder(
              itemCount: filtered.length,
              padding: const EdgeInsets.symmetric(horizontal: 12),
              itemBuilder: (context, idx) {
                final user = filtered[idx];
                final role = user['role'] as String? ?? '';
                final isSelf = user['email'] == widget.email;

                return Card(
                  elevation: 0,
                  margin: const EdgeInsets.only(bottom: 8),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(12),
                    side: BorderSide(color: Theme.of(context).dividerColor.withOpacity(0.08)),
                  ),
                  child: ListTile(
                    title: Text(
                      user['full_name'] as String? ?? user['username'] as String? ?? '',
                      style: const TextStyle(fontWeight: FontWeight.bold),
                    ),
                    subtitle: Text('${user['email']}\nRol: $role'),
                    isThreeLine: true,
                    trailing: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        IconButton(
                          icon: const Icon(Icons.edit_rounded, color: AppColors.primary),
                          onPressed: () => _openUserFormDialog(user),
                        ),
                        if (!isSelf)
                          IconButton(
                            icon: const Icon(Icons.delete_outline_rounded, color: AppColors.danger),
                            onPressed: () async {
                              final conf = await _confirmDeletion(user['full_name'] as String? ?? '');
                              if (conf) {
                                try {
                                  await _repository.deleteUser(email: widget.email, userId: user['id'] as int);
                                  _showSuccessSnackBar('Usuario eliminado correctamente.');
                                  _loadAllData();
                                } catch (e) {
                                  _showErrorSnackBar(e);
                                }
                              }
                            },
                          ),
                      ],
                    ),
                  ),
                );
              },
            ),
          ),
        ],
      ),
    );
  }

  void _openUserFormDialog(Map<String, dynamic>? existingUser) {
    final isEdit = existingUser != null;
    final formKey = GlobalKey<FormState>();

    final nameController = TextEditingController(text: existingUser?['full_name'] as String? ?? '');
    final emailController = TextEditingController(text: existingUser?['email'] as String? ?? '');
    final passwordController = TextEditingController();

    String selectedRole = existingUser?['role'] as String? ?? 'inspector';
    final List<int> selectedClientIds = List<int>.from(existingUser?['client_ids'] as List<dynamic>? ?? []);
    final List<int> selectedBranchIds = List<int>.from(existingUser?['branch_ids'] as List<dynamic>? ?? []);

    showDialog<void>(
      context: context,
      builder: (context) {
        return StatefulBuilder(
          builder: (context, setDialogState) {
            return AlertDialog(
              title: Text(isEdit ? 'Editar Usuario' : 'Crear Usuario'),
              content: SingleChildScrollView(
                child: Form(
                  key: formKey,
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      TextFormField(
                        controller: nameController,
                        decoration: const InputDecoration(labelText: 'Nombre Completo'),
                        validator: (v) => v == null || v.trim().isEmpty ? 'Requerido' : null,
                      ),
                      TextFormField(
                        controller: emailController,
                        decoration: const InputDecoration(labelText: 'Correo Electrónico'),
                        keyboardType: TextInputType.emailAddress,
                        validator: (v) => v == null || v.trim().isEmpty ? 'Requerido' : null,
                      ),
                      TextFormField(
                        controller: passwordController,
                        decoration: InputDecoration(
                          labelText: 'Contraseña',
                          helperText: isEdit ? 'Dejar en blanco para no cambiar' : 'Requerido',
                        ),
                        obscureText: true,
                        validator: (v) {
                          if (!isEdit && (v == null || v.isEmpty)) {
                            return 'Requerido';
                          }
                          return null;
                        },
                      ),
                      const SizedBox(height: 12),
                      DropdownButtonFormField<String>(
                        value: selectedRole,
                        decoration: const InputDecoration(labelText: 'Rol'),
                        items: const [
                          DropdownMenuItem(value: 'general_admin', child: Text('Administrador General')),
                          DropdownMenuItem(value: 'account_admin', child: Text('Administrador de Cuentas')),
                          DropdownMenuItem(value: 'branch_admin', child: Text('Administrador de Sucursal')),
                          DropdownMenuItem(value: 'inspector', child: Text('Inspector')),
                        ],
                        onChanged: (v) {
                          if (v != null) {
                            setDialogState(() => selectedRole = v);
                          }
                        },
                      ),
                      const SizedBox(height: 16),
                      const Align(
                        alignment: Alignment.centerLeft,
                        child: Text(
                          'Clientes Asignados',
                          style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14),
                        ),
                      ),
                      ..._clients.map((c) {
                        final cid = c['id'] as int;
                        final isSel = selectedClientIds.contains(cid);
                        return CheckboxListTile(
                          title: Text(c['name'] as String? ?? ''),
                          value: isSel,
                          dense: true,
                          onChanged: (v) {
                            setDialogState(() {
                              if (v == true) {
                                selectedClientIds.add(cid);
                              } else {
                                selectedClientIds.remove(cid);
                              }
                            });
                          },
                        );
                      }),
                      const SizedBox(height: 16),
                      const Align(
                        alignment: Alignment.centerLeft,
                        child: Text(
                          'Sucursales Asignadas',
                          style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14),
                        ),
                      ),
                      ..._branches.map((b) {
                        final bid = b['id'] as int;
                        final isSel = selectedBranchIds.contains(bid);
                        return CheckboxListTile(
                          title: Text('${b['name']} (${b['client']?['name'] ?? ''})'),
                          value: isSel,
                          dense: true,
                          onChanged: (v) {
                            setDialogState(() {
                              if (v == true) {
                                selectedBranchIds.add(bid);
                              } else {
                                selectedBranchIds.remove(bid);
                              }
                            });
                          },
                        );
                      }),
                    ],
                  ),
                ),
              ),
              actions: [
                TextButton(
                  onPressed: () => Navigator.of(context).pop(),
                  child: const Text('Cancelar'),
                ),
                FilledButton(
                  onPressed: () async {
                    if (formKey.currentState!.validate()) {
                      Navigator.of(context).pop();
                      try {
                        if (isEdit) {
                          final body = <String, dynamic>{
                            'full_name': nameController.text.trim(),
                            'email': emailController.text.trim(),
                            'role': selectedRole,
                            'client_ids': selectedClientIds,
                            'branch_ids': selectedBranchIds,
                          };
                          if (passwordController.text.isNotEmpty) {
                            body['password'] = passwordController.text;
                          }
                          await _repository.updateUser(
                            email: widget.email,
                            userId: existingUser['id'] as int,
                            body: body,
                          );
                          _showSuccessSnackBar('Usuario actualizado con éxito.');
                        } else {
                          await _repository.createUser(
                            email: widget.email,
                            fullName: nameController.text.trim(),
                            userEmail: emailController.text.trim(),
                            password: passwordController.text,
                            role: selectedRole,
                            clientIds: selectedClientIds,
                            branchIds: selectedBranchIds,
                          );
                          _showSuccessSnackBar('Usuario creado con éxito.');
                        }
                        _loadAllData();
                      } catch (e) {
                        _showErrorSnackBar(e);
                      }
                    }
                  },
                  child: const Text('Guardar'),
                ),
              ],
            );
          },
        );
      },
    );
  }

  // ==========================================
  // TAB: CLIENTES
  // ==========================================
  Widget _buildClientsTab() {
    final filtered = _clients.where((c) {
      final name = (c['name'] as String? ?? '').toLowerCase();
      final code = (c['code'] as String? ?? '').toLowerCase();
      final query = _clientSearch.toLowerCase();
      return name.contains(query) || code.contains(query);
    }).toList();

    return Scaffold(
      floatingActionButton: FloatingActionButton(
        onPressed: () => _openClientFormDialog(null),
        backgroundColor: AppColors.primary,
        child: const Icon(Icons.add_rounded, color: Colors.white),
      ),
      body: Column(
        children: [
          _buildSearchBar(
            hintText: 'Buscar clientes...',
            onChanged: (val) => setState(() => _clientSearch = val),
          ),
          Expanded(
            child: ListView.builder(
              itemCount: filtered.length,
              padding: const EdgeInsets.symmetric(horizontal: 12),
              itemBuilder: (context, idx) {
                final client = filtered[idx];

                return Card(
                  elevation: 0,
                  margin: const EdgeInsets.only(bottom: 8),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(12),
                    side: BorderSide(color: Theme.of(context).dividerColor.withOpacity(0.08)),
                  ),
                  child: ListTile(
                    title: Text(
                      client['name'] as String? ?? '',
                      style: const TextStyle(fontWeight: FontWeight.bold),
                    ),
                    subtitle: Text('Código: ${client['code']}\nNotas: ${client['notes'] ?? ''}'),
                    isThreeLine: true,
                    trailing: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        IconButton(
                          icon: const Icon(Icons.edit_rounded, color: AppColors.primary),
                          onPressed: () => _openClientFormDialog(client),
                        ),
                        IconButton(
                          icon: const Icon(Icons.delete_outline_rounded, color: AppColors.danger),
                          onPressed: () async {
                            final conf = await _confirmDeletion(client['name'] as String? ?? '');
                            if (conf) {
                              try {
                                await _repository.deleteClient(email: widget.email, clientId: client['id'] as int);
                                _showSuccessSnackBar('Cliente eliminado correctamente.');
                                _loadAllData();
                              } catch (e) {
                                _showErrorSnackBar(e);
                              }
                            }
                          },
                        ),
                      ],
                    ),
                  ),
                );
              },
            ),
          ),
        ],
      ),
    );
  }

  void _openClientFormDialog(Map<String, dynamic>? existingClient) {
    final isEdit = existingClient != null;
    final formKey = GlobalKey<FormState>();

    final nameController = TextEditingController(text: existingClient?['name'] as String? ?? '');
    final codeController = TextEditingController(text: existingClient?['code'] as String? ?? '');
    final notesController = TextEditingController(text: existingClient?['notes'] as String? ?? '');

    showDialog<void>(
      context: context,
      builder: (context) {
        return AlertDialog(
          title: Text(isEdit ? 'Editar Cliente' : 'Crear Cliente'),
          content: Form(
            key: formKey,
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                TextFormField(
                  controller: nameController,
                  decoration: const InputDecoration(labelText: 'Nombre del Cliente'),
                  validator: (v) => v == null || v.trim().isEmpty ? 'Requerido' : null,
                ),
                TextFormField(
                  controller: codeController,
                  decoration: const InputDecoration(labelText: 'Código'),
                  validator: (v) => v == null || v.trim().isEmpty ? 'Requerido' : null,
                ),
                TextFormField(
                  controller: notesController,
                  maxLines: 2,
                  decoration: const InputDecoration(labelText: 'Notas'),
                ),
              ],
            ),
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.of(context).pop(),
              child: const Text('Cancelar'),
            ),
            FilledButton(
              onPressed: () async {
                if (formKey.currentState!.validate()) {
                  Navigator.of(context).pop();
                  try {
                    if (isEdit) {
                      await _repository.updateClient(
                        email: widget.email,
                        clientId: existingClient['id'] as int,
                        body: {
                          'name': nameController.text.trim(),
                          'code': codeController.text.trim(),
                          'notes': notesController.text.trim(),
                        },
                      );
                      _showSuccessSnackBar('Cliente actualizado con éxito.');
                    } else {
                      await _repository.createClient(
                        email: widget.email,
                        name: nameController.text.trim(),
                        code: codeController.text.trim(),
                        notes: notesController.text.trim(),
                      );
                      _showSuccessSnackBar('Cliente creado con éxito.');
                    }
                    _loadAllData();
                  } catch (e) {
                    _showErrorSnackBar(e);
                  }
                }
              },
              child: const Text('Guardar'),
            ),
          ],
        );
      },
    );
  }

  // ==========================================
  // TAB: SUCURSALES
  // ==========================================
  Widget _buildBranchesTab() {
    final filtered = _branches.where((b) {
      final name = (b['name'] as String? ?? '').toLowerCase();
      final client = (b['client']?['name'] as String? ?? '').toLowerCase();
      final query = _branchSearch.toLowerCase();
      return name.contains(query) || client.contains(query);
    }).toList();

    return Scaffold(
      floatingActionButton: FloatingActionButton(
        onPressed: () => _openBranchFormDialog(null),
        backgroundColor: AppColors.primary,
        child: const Icon(Icons.add_rounded, color: Colors.white),
      ),
      body: Column(
        children: [
          _buildSearchBar(
            hintText: 'Buscar sucursales...',
            onChanged: (val) => setState(() => _branchSearch = val),
          ),
          Expanded(
            child: ListView.builder(
              itemCount: filtered.length,
              padding: const EdgeInsets.symmetric(horizontal: 12),
              itemBuilder: (context, idx) {
                final branch = filtered[idx];

                return Card(
                  elevation: 0,
                  margin: const EdgeInsets.only(bottom: 8),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(12),
                    side: BorderSide(color: Theme.of(context).dividerColor.withOpacity(0.08)),
                  ),
                  child: ListTile(
                    title: Text(
                      branch['name'] as String? ?? '',
                      style: const TextStyle(fontWeight: FontWeight.bold),
                    ),
                    subtitle: Text(
                      'Cliente: ${branch['client']?['name'] ?? ''}\nDirección: ${branch['address'] ?? ''}, ${branch['city'] ?? ''}',
                    ),
                    isThreeLine: true,
                    trailing: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        IconButton(
                          icon: const Icon(Icons.edit_rounded, color: AppColors.primary),
                          onPressed: () => _openBranchFormDialog(branch),
                        ),
                        IconButton(
                          icon: const Icon(Icons.delete_outline_rounded, color: AppColors.danger),
                          onPressed: () async {
                            final conf = await _confirmDeletion(branch['name'] as String? ?? '');
                            if (conf) {
                              try {
                                await _repository.deleteBranch(email: widget.email, branchId: branch['id'] as int);
                                _showSuccessSnackBar('Sucursal eliminada correctamente.');
                                _loadAllData();
                              } catch (e) {
                                _showErrorSnackBar(e);
                              }
                            }
                          },
                        ),
                      ],
                    ),
                  ),
                );
              },
            ),
          ),
        ],
      ),
    );
  }

  void _openBranchFormDialog(Map<String, dynamic>? existingBranch) {
    if (_clients.isEmpty) {
      _showErrorSnackBar('Debes crear al menos un Cliente antes de agregar sucursales.');
      return;
    }

    final isEdit = existingBranch != null;
    final formKey = GlobalKey<FormState>();

    final nameController = TextEditingController(text: existingBranch?['name'] as String? ?? '');
    final addressController = TextEditingController(text: existingBranch?['address'] as String? ?? '');
    final cityController = TextEditingController(text: existingBranch?['city'] as String? ?? '');

    int selectedClientId = existingBranch?['client']?['id'] as int? ?? _clients.first['id'] as int;

    showDialog<void>(
      context: context,
      builder: (context) {
        return StatefulBuilder(
          builder: (context, setDialogState) {
            return AlertDialog(
              title: Text(isEdit ? 'Editar Sucursal' : 'Crear Sucursal'),
              content: Form(
                key: formKey,
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    DropdownButtonFormField<int>(
                      value: selectedClientId,
                      decoration: const InputDecoration(labelText: 'Cliente'),
                      items: _clients.map((c) {
                        return DropdownMenuItem<int>(
                          value: c['id'] as int,
                          child: Text(c['name'] as String? ?? ''),
                        );
                      }).toList(),
                      onChanged: (v) {
                        if (v != null) {
                          setDialogState(() => selectedClientId = v);
                        }
                      },
                    ),
                    TextFormField(
                      controller: nameController,
                      decoration: const InputDecoration(labelText: 'Nombre de la Sucursal'),
                      validator: (v) => v == null || v.trim().isEmpty ? 'Requerido' : null,
                    ),
                    TextFormField(
                      controller: addressController,
                      decoration: const InputDecoration(labelText: 'Dirección'),
                    ),
                    TextFormField(
                      controller: cityController,
                      decoration: const InputDecoration(labelText: 'Ciudad'),
                    ),
                  ],
                ),
              ),
              actions: [
                TextButton(
                  onPressed: () => Navigator.of(context).pop(),
                  child: const Text('Cancelar'),
                ),
                FilledButton(
                  onPressed: () async {
                    if (formKey.currentState!.validate()) {
                      Navigator.of(context).pop();
                      try {
                        if (isEdit) {
                          await _repository.updateBranch(
                            email: widget.email,
                            branchId: existingBranch['id'] as int,
                            body: {
                              'client_id': selectedClientId,
                              'name': nameController.text.trim(),
                              'address': addressController.text.trim(),
                              'city': cityController.text.trim(),
                            },
                          );
                          _showSuccessSnackBar('Sucursal actualizada con éxito.');
                        } else {
                          await _repository.createBranch(
                            email: widget.email,
                            clientId: selectedClientId,
                            name: nameController.text.trim(),
                            address: addressController.text.trim(),
                            city: cityController.text.trim(),
                          );
                          _showSuccessSnackBar('Sucursal creada con éxito.');
                        }
                        _loadAllData();
                      } catch (e) {
                        _showErrorSnackBar(e);
                      }
                    }
                  },
                  child: const Text('Guardar'),
                ),
              ],
            );
          },
        );
      },
    );
  }

  // ==========================================
  // TAB: AREAS
  // ==========================================
  Widget _buildAreasTab() {
    final filtered = _areas.where((a) {
      final name = (a['name'] as String? ?? '').toLowerCase();
      final branch = (a['branch']?['name'] as String? ?? '').toLowerCase();
      final query = _areaSearch.toLowerCase();
      return name.contains(query) || branch.contains(query);
    }).toList();

    return Scaffold(
      floatingActionButton: FloatingActionButton(
        onPressed: () => _openAreaFormDialog(null),
        backgroundColor: AppColors.primary,
        child: const Icon(Icons.add_rounded, color: Colors.white),
      ),
      body: Column(
        children: [
          _buildSearchBar(
            hintText: 'Buscar áreas...',
            onChanged: (val) => setState(() => _areaSearch = val),
          ),
          Expanded(
            child: ListView.builder(
              itemCount: filtered.length,
              padding: const EdgeInsets.symmetric(horizontal: 12),
              itemBuilder: (context, idx) {
                final area = filtered[idx];

                return Card(
                  elevation: 0,
                  margin: const EdgeInsets.only(bottom: 8),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(12),
                    side: BorderSide(color: Theme.of(context).dividerColor.withOpacity(0.08)),
                  ),
                  child: ListTile(
                    title: Text(
                      area['name'] as String? ?? '',
                      style: const TextStyle(fontWeight: FontWeight.bold),
                    ),
                    subtitle: Text(
                      'Sucursal: ${area['branch']?['name'] ?? ''} (${area['branch']?['client']?['name'] ?? ''})\nDescripción: ${area['description'] ?? ''}',
                    ),
                    isThreeLine: true,
                    trailing: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        IconButton(
                          icon: const Icon(Icons.edit_rounded, color: AppColors.primary),
                          onPressed: () => _openAreaFormDialog(area),
                        ),
                        IconButton(
                          icon: const Icon(Icons.delete_outline_rounded, color: AppColors.danger),
                          onPressed: () async {
                            final conf = await _confirmDeletion(area['name'] as String? ?? '');
                            if (conf) {
                              try {
                                await _repository.deleteArea(email: widget.email, areaId: area['id'] as int);
                                _showSuccessSnackBar('Área eliminada correctamente.');
                                _loadAllData();
                              } catch (e) {
                                _showErrorSnackBar(e);
                              }
                            }
                          },
                        ),
                      ],
                    ),
                  ),
                );
              },
            ),
          ),
        ],
      ),
    );
  }

  void _openAreaFormDialog(Map<String, dynamic>? existingArea) {
    if (_branches.isEmpty) {
      _showErrorSnackBar('Debes crear al menos una Sucursal antes de agregar áreas.');
      return;
    }

    final isEdit = existingArea != null;
    final formKey = GlobalKey<FormState>();

    final nameController = TextEditingController(text: existingArea?['name'] as String? ?? '');
    final descController = TextEditingController(text: existingArea?['description'] as String? ?? '');

    int selectedBranchId = existingArea?['branch']?['id'] as int? ?? _branches.first['id'] as int;

    showDialog<void>(
      context: context,
      builder: (context) {
        return StatefulBuilder(
          builder: (context, setDialogState) {
            return AlertDialog(
              title: Text(isEdit ? 'Editar Área' : 'Crear Área'),
              content: Form(
                key: formKey,
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    DropdownButtonFormField<int>(
                      value: selectedBranchId,
                      decoration: const InputDecoration(labelText: 'Sucursal'),
                      items: _branches.map((b) {
                        return DropdownMenuItem<int>(
                          value: b['id'] as int,
                          child: Text('${b['name']} (${b['client']?['name'] ?? ''})'),
                        );
                      }).toList(),
                      onChanged: (v) {
                        if (v != null) {
                          setDialogState(() => selectedBranchId = v);
                        }
                      },
                    ),
                    TextFormField(
                      controller: nameController,
                      decoration: const InputDecoration(labelText: 'Nombre del Área'),
                      validator: (v) => v == null || v.trim().isEmpty ? 'Requerido' : null,
                    ),
                    TextFormField(
                      controller: descController,
                      decoration: const InputDecoration(labelText: 'Descripción'),
                    ),
                  ],
                ),
              ),
              actions: [
                TextButton(
                  onPressed: () => Navigator.of(context).pop(),
                  child: const Text('Cancelar'),
                ),
                FilledButton(
                  onPressed: () async {
                    if (formKey.currentState!.validate()) {
                      Navigator.of(context).pop();
                      try {
                        if (isEdit) {
                          await _repository.updateArea(
                            email: widget.email,
                            areaId: existingArea['id'] as int,
                            body: {
                              'branch_id': selectedBranchId,
                              'name': nameController.text.trim(),
                              'description': descController.text.trim(),
                            },
                          );
                          _showSuccessSnackBar('Área actualizada con éxito.');
                        } else {
                          await _repository.createArea(
                            email: widget.email,
                            branchId: selectedBranchId,
                            name: nameController.text.trim(),
                            description: descController.text.trim(),
                          );
                          _showSuccessSnackBar('Área creada con éxito.');
                        }
                        _loadAllData();
                      } catch (e) {
                        _showErrorSnackBar(e);
                      }
                    }
                  },
                  child: const Text('Guardar'),
                ),
              ],
            );
          },
        );
      },
    );
  }

  // ==========================================
  // TAB: DOSIFICADORES
  // ==========================================
  Widget _buildDispensersTab() {
    final filtered = _dispensers.where((d) {
      final area = (d['area']?['name'] as String? ?? '').toLowerCase();
      final branch = (d['area']?['branch']?['name'] as String? ?? '').toLowerCase();
      final model = (d['model']?['name'] as String? ?? '').toLowerCase();
      final query = _dispenserSearch.toLowerCase();
      return area.contains(query) || branch.contains(query) || model.contains(query);
    }).toList();

    return Scaffold(
      floatingActionButton: FloatingActionButton(
        onPressed: () => _openDispenserFormDialog(null),
        backgroundColor: AppColors.primary,
        child: const Icon(Icons.add_rounded, color: Colors.white),
      ),
      body: Column(
        children: [
          _buildSearchBar(
            hintText: 'Buscar dosificadores...',
            onChanged: (val) => setState(() => _dispenserSearch = val),
          ),
          Expanded(
            child: ListView.builder(
              itemCount: filtered.length,
              padding: const EdgeInsets.symmetric(horizontal: 12),
              itemBuilder: (context, idx) {
                final dispenser = filtered[idx];
                final productsList = (dispenser['products'] as List<dynamic>? ?? [])
                    .map((p) => p['name'] as String? ?? '')
                    .join(', ');

                return Card(
                  elevation: 0,
                  margin: const EdgeInsets.only(bottom: 8),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(12),
                    side: BorderSide(color: Theme.of(context).dividerColor.withOpacity(0.08)),
                  ),
                  child: ListTile(
                    title: Text(
                      'Modelo: ${dispenser['model']?['name'] ?? ''}',
                      style: const TextStyle(fontWeight: FontWeight.bold),
                    ),
                    subtitle: Text(
                      'Ubicación: ${dispenser['area']?['name'] ?? ''} (${dispenser['area']?['branch']?['name'] ?? ''})\nProductos: ${productsList.isEmpty ? "Ninguno" : productsList}',
                    ),
                    isThreeLine: true,
                    trailing: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        IconButton(
                          icon: const Icon(Icons.edit_rounded, color: AppColors.primary),
                          onPressed: () => _openDispenserFormDialog(dispenser),
                        ),
                        IconButton(
                          icon: const Icon(Icons.delete_outline_rounded, color: AppColors.danger),
                          onPressed: () async {
                            final conf = await _confirmDeletion('Dosificador ${dispenser['model']?['name'] ?? ''}');
                            if (conf) {
                              try {
                                await _repository.deleteDispenser(email: widget.email, dispenserId: dispenser['id'] as int);
                                _showSuccessSnackBar('Dosificador eliminado correctamente.');
                                _loadAllData();
                              } catch (e) {
                                _showErrorSnackBar(e);
                              }
                            }
                          },
                        ),
                      ],
                    ),
                  ),
                );
              },
            ),
          ),
        ],
      ),
    );
  }

  void _openDispenserFormDialog(Map<String, dynamic>? existingDispenser) {
    if (_areas.isEmpty || _dispenserModels.isEmpty) {
      _showErrorSnackBar('Debes tener áreas y modelos de dosificador creados.');
      return;
    }

    final isEdit = existingDispenser != null;
    final formKey = GlobalKey<FormState>();

    int selectedAreaId = existingDispenser?['area']?['id'] as int? ?? _areas.first['id'] as int;
    int selectedModelId = existingDispenser?['model']?['id'] as int? ?? _dispenserModels.first['id'] as int;

    // Load selected product ids
    final List<int> selectedProductIds = isEdit
        ? (existingDispenser['products'] as List<dynamic>? ?? []).map((p) => p['id'] as int).toList()
        : [];

    showDialog<void>(
      context: context,
      builder: (context) {
        return StatefulBuilder(
          builder: (context, setDialogState) {
            return AlertDialog(
              title: Text(isEdit ? 'Editar Dosificador' : 'Crear Dosificador'),
              content: SingleChildScrollView(
                child: Form(
                  key: formKey,
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      DropdownButtonFormField<int>(
                        value: selectedAreaId,
                        decoration: const InputDecoration(labelText: 'Área'),
                        items: _areas.map((a) {
                          return DropdownMenuItem<int>(
                            value: a['id'] as int,
                            child: Text('${a['name']} (${a['branch']?['name'] ?? ''})'),
                          );
                        }).toList(),
                        onChanged: (v) {
                          if (v != null) {
                            setDialogState(() => selectedAreaId = v);
                          }
                        },
                      ),
                      DropdownButtonFormField<int>(
                        value: selectedModelId,
                        decoration: const InputDecoration(labelText: 'Modelo'),
                        items: _dispenserModels.map((m) {
                          return DropdownMenuItem<int>(
                            value: m['id'] as int,
                            child: Text(m['name'] as String? ?? ''),
                          );
                        }).toList(),
                        onChanged: (v) {
                          if (v != null) {
                            setDialogState(() => selectedModelId = v);
                          }
                        },
                      ),
                      const SizedBox(height: 16),
                      const Align(
                        alignment: Alignment.centerLeft,
                        child: Text(
                          'Productos Asignados',
                          style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14),
                        ),
                      ),
                      const SizedBox(height: 8),
                      if (_products.isEmpty)
                        const Text('No hay productos disponibles para asignar.')
                      else
                        ..._products.map((p) {
                          final pid = p['id'] as int;
                          final isSel = selectedProductIds.contains(pid);
                          return CheckboxListTile(
                            title: Text(p['name'] as String? ?? ''),
                            value: isSel,
                            dense: true,
                            onChanged: (v) {
                              setDialogState(() {
                                if (v == true) {
                                  selectedProductIds.add(pid);
                                } else {
                                  selectedProductIds.remove(pid);
                                }
                              });
                            },
                          );
                        }),
                    ],
                  ),
                ),
              ),
              actions: [
                TextButton(
                  onPressed: () => Navigator.of(context).pop(),
                  child: const Text('Cancelar'),
                ),
                FilledButton(
                  onPressed: () async {
                    if (formKey.currentState!.validate()) {
                      Navigator.of(context).pop();
                      try {
                        if (isEdit) {
                          await _repository.updateDispenser(
                            email: widget.email,
                            dispenserId: existingDispenser['id'] as int,
                            body: {
                              'area_id': selectedAreaId,
                              'model_id': selectedModelId,
                              'product_ids': selectedProductIds,
                            },
                          );
                          _showSuccessSnackBar('Dosificador actualizado con éxito.');
                        } else {
                          await _repository.createDispenser(
                            email: widget.email,
                            areaId: selectedAreaId,
                            modelId: selectedModelId,
                            productIds: selectedProductIds,
                          );
                          _showSuccessSnackBar('Dosificador creado con éxito.');
                        }
                        _loadAllData();
                      } catch (e) {
                        _showErrorSnackBar(e);
                      }
                    }
                  },
                  child: const Text('Guardar'),
                ),
              ],
            );
          },
        );
      },
    );
  }

  // ==========================================
  // TAB: PRODUCTOS
  // ==========================================
  Widget _buildProductsTab() {
    final filtered = _products.where((p) {
      final name = (p['name'] as String? ?? '').toLowerCase();
      final desc = (p['description'] as String? ?? '').toLowerCase();
      final query = _productSearch.toLowerCase();
      return name.contains(query) || desc.contains(query);
    }).toList();

    return Scaffold(
      floatingActionButton: FloatingActionButton(
        onPressed: () => _openProductFormDialog(null),
        backgroundColor: AppColors.primary,
        child: const Icon(Icons.add_rounded, color: Colors.white),
      ),
      body: Column(
        children: [
          _buildSearchBar(
            hintText: 'Buscar productos...',
            onChanged: (val) => setState(() => _productSearch = val),
          ),
          Expanded(
            child: ListView.builder(
              itemCount: filtered.length,
              padding: const EdgeInsets.symmetric(horizontal: 12),
              itemBuilder: (context, idx) {
                final product = filtered[idx];

                return Card(
                  elevation: 0,
                  margin: const EdgeInsets.only(bottom: 8),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(12),
                    side: BorderSide(color: Theme.of(context).dividerColor.withOpacity(0.08)),
                  ),
                  child: ListTile(
                    title: Text(
                      product['name'] as String? ?? '',
                      style: const TextStyle(fontWeight: FontWeight.bold),
                    ),
                    subtitle: Text(product['description'] as String? ?? 'Sin descripción'),
                    isThreeLine: true,
                    trailing: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        IconButton(
                          icon: const Icon(Icons.edit_rounded, color: AppColors.primary),
                          onPressed: () => _openProductFormDialog(product),
                        ),
                        IconButton(
                          icon: const Icon(Icons.delete_outline_rounded, color: AppColors.danger),
                          onPressed: () async {
                            final conf = await _confirmDeletion(product['name'] as String? ?? '');
                            if (conf) {
                              try {
                                await _repository.deleteProduct(email: widget.email, productId: product['id'] as int);
                                _showSuccessSnackBar('Producto eliminado correctamente.');
                                _loadAllData();
                              } catch (e) {
                                _showErrorSnackBar(e);
                              }
                            }
                          },
                        ),
                      ],
                    ),
                  ),
                );
              },
            ),
          ),
        ],
      ),
    );
  }

  void _openProductFormDialog(Map<String, dynamic>? existingProduct) {
    final isEdit = existingProduct != null;
    final formKey = GlobalKey<FormState>();

    final nameController = TextEditingController(text: existingProduct?['name'] as String? ?? '');
    final descController = TextEditingController(text: existingProduct?['description'] as String? ?? '');

    showDialog<void>(
      context: context,
      builder: (context) {
        return AlertDialog(
          title: Text(isEdit ? 'Editar Producto' : 'Crear Producto'),
          content: Form(
            key: formKey,
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                TextFormField(
                  controller: nameController,
                  decoration: const InputDecoration(labelText: 'Nombre del Producto'),
                  validator: (v) => v == null || v.trim().isEmpty ? 'Requerido' : null,
                ),
                TextFormField(
                  controller: descController,
                  decoration: const InputDecoration(labelText: 'Descripción'),
                ),
              ],
            ),
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.of(context).pop(),
              child: const Text('Cancelar'),
            ),
            FilledButton(
              onPressed: () async {
                if (formKey.currentState!.validate()) {
                  Navigator.of(context).pop();
                  try {
                    if (isEdit) {
                      await _repository.updateProduct(
                        email: widget.email,
                        productId: existingProduct['id'] as int,
                        body: {
                          'name': nameController.text.trim(),
                          'description': descController.text.trim(),
                        },
                      );
                      _showSuccessSnackBar('Producto actualizado con éxito.');
                    } else {
                      await _repository.createProduct(
                        email: widget.email,
                        name: nameController.text.trim(),
                        description: descController.text.trim(),
                      );
                      _showSuccessSnackBar('Producto creado con éxito.');
                    }
                    _loadAllData();
                  } catch (e) {
                    _showErrorSnackBar(e);
                  }
                }
              },
              child: const Text('Guardar'),
            ),
          ],
        );
      },
    );
  }
}
