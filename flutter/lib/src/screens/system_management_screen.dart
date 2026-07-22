import 'package:flutter/material.dart';

import '../services/trust_repository.dart';
import '../theme/app_colors.dart';

// Import new full screen forms
import 'user_form_screen.dart';
import 'client_form_screen.dart';
import 'branch_form_screen.dart';
import 'area_form_screen.dart';
import 'dispenser_form_screen.dart';
import 'product_form_screen.dart';

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
  List<Map<String, dynamic>> _nozzles = [];

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
        _repository.loadNozzles(widget.email),
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
        _nozzles = results[7];
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
          'Administración',
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
                        const Icon(Icons.error_outline_rounded, size: 64, color: AppColors.danger),
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
        onPressed: () async {
          final result = await Navigator.of(context).push<bool>(
            MaterialPageRoute(
              builder: (_) => UserFormScreen(
                email: widget.email,
                clients: _clients,
                branches: _branches,
              ),
            ),
          );
          if (result == true) _loadAllData();
        },
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
                          onPressed: () async {
                            final result = await Navigator.of(context).push<bool>(
                              MaterialPageRoute(
                                builder: (_) => UserFormScreen(
                                  email: widget.email,
                                  existingUser: user,
                                  clients: _clients,
                                  branches: _branches,
                                ),
                              ),
                            );
                            if (result == true) _loadAllData();
                          },
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
        onPressed: () async {
          final result = await Navigator.of(context).push<bool>(
            MaterialPageRoute(
              builder: (_) => ClientFormScreen(email: widget.email),
            ),
          );
          if (result == true) _loadAllData();
        },
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
                          onPressed: () async {
                            final result = await Navigator.of(context).push<bool>(
                              MaterialPageRoute(
                                builder: (_) => ClientFormScreen(
                                  email: widget.email,
                                  existingClient: client,
                                ),
                              ),
                            );
                            if (result == true) _loadAllData();
                          },
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
        onPressed: () async {
          final result = await Navigator.of(context).push<bool>(
            MaterialPageRoute(
              builder: (_) => BranchFormScreen(
                email: widget.email,
                clients: _clients,
              ),
            ),
          );
          if (result == true) _loadAllData();
        },
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
                          onPressed: () async {
                            final result = await Navigator.of(context).push<bool>(
                              MaterialPageRoute(
                                builder: (_) => BranchFormScreen(
                                  email: widget.email,
                                  existingBranch: branch,
                                  clients: _clients,
                                ),
                              ),
                            );
                            if (result == true) _loadAllData();
                          },
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
        onPressed: () async {
          final result = await Navigator.of(context).push<bool>(
            MaterialPageRoute(
              builder: (_) => AreaFormScreen(
                email: widget.email,
                branches: _branches,
              ),
            ),
          );
          if (result == true) _loadAllData();
        },
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
                      'Sucursal: ${area['branch']?['name'] ?? ''} (${area['branch']?['client'] ?? ''})\nDescripción: ${area['description'] ?? ''}',
                    ),
                    isThreeLine: true,
                    trailing: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        IconButton(
                          icon: const Icon(Icons.edit_rounded, color: AppColors.primary),
                          onPressed: () async {
                            final result = await Navigator.of(context).push<bool>(
                              MaterialPageRoute(
                                builder: (_) => AreaFormScreen(
                                  email: widget.email,
                                  existingArea: area,
                                  branches: _branches,
                                ),
                              ),
                            );
                            if (result == true) _loadAllData();
                          },
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

  // ==========================================
  // TAB: DOSIFICADORES
  // ==========================================
  Widget _buildDispensersTab() {
    final filtered = _dispensers.where((d) {
      final area = (d['area']?['name'] as String? ?? '').toLowerCase();
      final branch = (d['area']?['branch'] as String? ?? '').toLowerCase();
      final model = (d['model']?['name'] as String? ?? '').toLowerCase();
      final query = _dispenserSearch.toLowerCase();
      return area.contains(query) || branch.contains(query) || model.contains(query);
    }).toList();

    return Scaffold(
      floatingActionButton: FloatingActionButton(
        onPressed: () async {
          final result = await Navigator.of(context).push<bool>(
            MaterialPageRoute(
              builder: (_) => DispenserFormScreen(
                email: widget.email,
                areas: _areas,
                dispenserModels: _dispenserModels,
                products: _products,
                nozzles: _nozzles,
              ),
            ),
          );
          if (result == true) _loadAllData();
        },
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
                      'Ubicación: ${dispenser['area']?['name'] ?? ''} (${dispenser['area']?['branch'] ?? ''})\nProductos: ${productsList.isEmpty ? "Ninguno" : productsList}',
                    ),
                    isThreeLine: true,
                    trailing: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        IconButton(
                          icon: const Icon(Icons.edit_rounded, color: AppColors.primary),
                          onPressed: () async {
                            final result = await Navigator.of(context).push<bool>(
                              MaterialPageRoute(
                                builder: (_) => DispenserFormScreen(
                                  email: widget.email,
                                  existingDispenser: dispenser,
                                  areas: _areas,
                                  dispenserModels: _dispenserModels,
                                  products: _products,
                                  nozzles: _nozzles,
                                ),
                              ),
                            );
                            if (result == true) _loadAllData();
                          },
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
        onPressed: () async {
          final result = await Navigator.of(context).push<bool>(
            MaterialPageRoute(
              builder: (_) => ProductFormScreen(email: widget.email),
            ),
          );
          if (result == true) _loadAllData();
        },
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
                          onPressed: () async {
                            final result = await Navigator.of(context).push<bool>(
                              MaterialPageRoute(
                                builder: (_) => ProductFormScreen(
                                  email: widget.email,
                                  existingProduct: product,
                                ),
                              ),
                            );
                            if (result == true) _loadAllData();
                          },
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
}
