import 'dart:io';

import 'package:camera/camera.dart';
import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import 'package:http_parser/http_parser.dart';

import '../../services/trust_repository.dart';

class NewIncidentScreen extends StatefulWidget {
  const NewIncidentScreen({required this.email, super.key});

  final String email;

  @override
  State<NewIncidentScreen> createState() => _NewIncidentScreenState();
}

class _NewIncidentScreenState extends State<NewIncidentScreen> {
  final TrustRepository _repository = TrustRepository();

  int _step = 0;
  bool _loading = true;
  bool _submitting = false;
  String? _error;

  List<Map<String, dynamic>> _clients = const [];
  List<Map<String, dynamic>> _branches = const [];
  List<Map<String, dynamic>> _areas = const [];
  List<Map<String, dynamic>> _dispensers = const [];

  int? _clientId;
  int? _branchId;
  int? _areaId;
  int? _dispenserId;
  final TextEditingController _descriptionController = TextEditingController();
  final List<File> _evidenceFiles = [];

  static const _primaryColor = Color(0xFFFACC15);
  static const _textPrimary = Color(0xFF0F172A);
  static const _textSecondary = Color(0xFF64748B);

  @override
  void initState() {
    super.initState();
    _loadCatalogs();
  }

  @override
  void dispose() {
    _descriptionController.dispose();
    super.dispose();
  }

  List<Map<String, dynamic>> get _filteredBranches => _branches
      .where((b) => _clientId == null || ((b['client'] as Map<String, dynamic>?)?['id'] as int?) == _clientId)
      .toList(growable: false);

  List<Map<String, dynamic>> get _filteredAreas => _areas
      .where((a) => _branchId == null || ((a['branch'] as Map<String, dynamic>?)?['id'] as int?) == _branchId)
      .toList(growable: false);

  List<Map<String, dynamic>> get _filteredDispensers => _dispensers.where((d) {
        final area = d['area'] as Map<String, dynamic>?;
        final areaId = area?['id'] as int?;
        return _areaId == null || areaId == _areaId;
      }).toList(growable: false);

  Future<void> _loadCatalogs() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final results = await Future.wait([
        _repository.loadClients(widget.email),
        _repository.loadBranches(widget.email),
        _repository.loadAreas(widget.email),
        _repository.loadDispensers(widget.email),
      ]);

      if (!mounted) return;
      setState(() {
        _clients = results[0];
        _branches = results[1];
        _areas = results[2];
        _dispensers = results[3];
        _loading = false;
      });
    } catch (error) {
      if (!mounted) return;
      setState(() {
        _error = error.toString();
        _loading = false;
      });
    }
  }

  bool get _canContinue {
    if (_step == 0) {
      return _clientId != null && _branchId != null;
    }
    if (_step == 1) {
      return _areaId != null && _dispenserId != null && _descriptionController.text.trim().isNotEmpty;
    }
    return true;
  }

  InputDecoration _mobileInputDecoration(String label) {
    return InputDecoration(
      labelText: label,
      labelStyle: const TextStyle(color: Color(0xFF334155), fontWeight: FontWeight.w600),
      filled: true,
      fillColor: Colors.white,
      contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 14),
      border: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: const BorderSide(color: Color(0xFFD1D5DB)),
      ),
      enabledBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: const BorderSide(color: Color(0xFFD1D5DB)),
      ),
      disabledBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: const BorderSide(color: Color(0xFFE5E7EB)),
      ),
      focusedBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: const BorderSide(color: _primaryColor, width: 1.8),
      ),
    );
  }

  Future<void> _captureEvidence() async {
    try {
      final cameras = await availableCameras();
      if (!mounted || cameras.isEmpty) return;

      final file = await Navigator.of(context).push<File>(
        MaterialPageRoute(
          builder: (_) => _IncidentCameraScreen(camera: cameras.first),
        ),
      );

      if (file != null && mounted) {
        setState(() => _evidenceFiles.add(file));
      }
    } catch (_) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('No se pudo abrir la cámara.')),
      );
    }
  }

  Future<void> _submit() async {
    if (_clientId == null || _branchId == null || _areaId == null || _dispenserId == null) {
      return;
    }

    setState(() {
      _submitting = true;
      _error = null;
    });

    try {
      final files = <http.MultipartFile>[];
      for (var i = 0; i < _evidenceFiles.length; i++) {
        final file = _evidenceFiles[i];
        files.add(
          await http.MultipartFile.fromPath(
            'evidence_files',
            file.path,
            filename: 'evidencia_${DateTime.now().millisecondsSinceEpoch}_$i.jpg',
            contentType: MediaType('image', 'jpeg'),
          ),
        );
      }

      await _repository.createIncident(
        email: widget.email,
        clientId: _clientId!,
        branchId: _branchId!,
        areaId: _areaId!,
        dispenserId: _dispenserId!,
        description: _descriptionController.text.trim(),
        evidenceFiles: files,
      );

      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Incidencia registrada correctamente.')),
      );
      Navigator.of(context).pop(true);
    } catch (error) {
      if (!mounted) return;
      setState(() => _error = error.toString());
    } finally {
      if (mounted) {
        setState(() => _submitting = false);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final progressValue = (_step + 1) / 3;

    return Scaffold(
      backgroundColor: Colors.white,
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : SafeArea(
              child: Column(
                children: [
                  Expanded(
                    child: Padding(
                      padding: const EdgeInsets.fromLTRB(16, 18, 16, 0),
                      child: Column(
                        children: [
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              Text(
                                'Paso ${_step + 1} de 3',
                                style: const TextStyle(
                                  color: _primaryColor,
                                  fontSize: 12,
                                  fontWeight: FontWeight.w700,
                                  letterSpacing: 0.8,
                                ),
                              ),
                              Text(
                                '${(progressValue * 100).round()}%',
                                style: const TextStyle(color: _textSecondary, fontSize: 12, fontWeight: FontWeight.w600),
                              ),
                            ],
                          ),
                          const SizedBox(height: 8),
                          ClipRRect(
                            borderRadius: BorderRadius.circular(999),
                            child: LinearProgressIndicator(
                              value: progressValue,
                              minHeight: 6,
                              backgroundColor: const Color(0xFFE2E8F0),
                              valueColor: const AlwaysStoppedAnimation<Color>(_primaryColor),
                            ),
                          ),
                          const SizedBox(height: 16),
                          if (_error != null)
                            Container(
                              width: double.infinity,
                              margin: const EdgeInsets.only(bottom: 12),
                              padding: const EdgeInsets.all(12),
                              decoration: BoxDecoration(
                                color: const Color(0xFFFEF2F2),
                                borderRadius: BorderRadius.circular(12),
                                border: Border.all(color: const Color(0xFFFECACA)),
                              ),
                              child: Text(_error!, style: const TextStyle(color: Color(0xFFB91C1C), fontSize: 13)),
                            ),
                          Expanded(child: _buildStep()),
                        ],
                      ),
                    ),
                  ),
                  Container(
                    decoration: const BoxDecoration(
                      border: Border(top: BorderSide(color: Color(0xFFE2E8F0))),
                    ),
                    padding: const EdgeInsets.fromLTRB(16, 12, 16, 16),
                    child: Row(
                      children: [
                        Expanded(
                          child: OutlinedButton(
                            onPressed: _submitting
                                ? null
                                : () {
                                    if (_step == 0) {
                                      Navigator.of(context).pop();
                                      return;
                                    }
                                    setState(() => _step -= 1);
                                  },
                            style: OutlinedButton.styleFrom(
                              minimumSize: const Size.fromHeight(50),
                              side: const BorderSide(color: Color(0xFFCBD5E1)),
                              foregroundColor: _textPrimary,
                              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                              textStyle: const TextStyle(fontWeight: FontWeight.w700),
                            ),
                            child: Text(_step == 0 ? 'Cancelar' : 'Atrás'),
                          ),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: FilledButton(
                            onPressed: !_canContinue || _submitting
                                ? null
                                : () {
                                    if (_step < 2) {
                                      setState(() => _step += 1);
                                    } else {
                                      _submit();
                                    }
                                  },
                            style: FilledButton.styleFrom(
                              minimumSize: const Size.fromHeight(50),
                              backgroundColor: _primaryColor,
                              foregroundColor: Colors.black,
                              disabledBackgroundColor: const Color(0xFFE2E8F0),
                              disabledForegroundColor: const Color(0xFF64748B),
                              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                              textStyle: const TextStyle(fontWeight: FontWeight.w800),
                            ),
                            child: Text(_step < 2 ? 'Siguiente' : (_submitting ? 'Guardando...' : 'Finalizar incidencia')),
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
    );
  }

  Widget _buildStep() {
    if (_step == 0) {
      return ListView(
        children: [
          const Text('Seleccionar ubicación', style: TextStyle(fontSize: 32, fontWeight: FontWeight.w800, color: _textPrimary)),
          const SizedBox(height: 8),
          const Text(
            'Identifica dónde ocurrió el incidente para asignarlo correctamente.',
            style: TextStyle(fontSize: 15, color: _textSecondary),
          ),
          const SizedBox(height: 20),
          DropdownButtonFormField<int>(
            value: _clientId,
            decoration: _mobileInputDecoration('Cliente'),
            items: _clients
                .map((c) => DropdownMenuItem<int>(value: c['id'] as int?, child: Text(c['name'] as String? ?? 'Cliente')))
                .toList(growable: false),
            onChanged: (value) {
              setState(() {
                _clientId = value;
                _branchId = null;
                _areaId = null;
                _dispenserId = null;
              });
            },
          ),
          const SizedBox(height: 12),
          DropdownButtonFormField<int>(
            value: _branchId,
            decoration: _mobileInputDecoration('Sucursal'),
            items: _filteredBranches
                .map((b) => DropdownMenuItem<int>(value: b['id'] as int?, child: Text(b['name'] as String? ?? 'Sucursal')))
                .toList(growable: false),
            onChanged: _clientId == null
                ? null
                : (value) {
                    setState(() {
                      _branchId = value;
                      _areaId = null;
                      _dispenserId = null;
                    });
                  },
          ),
        ],
      );
    }

    if (_step == 1) {
      return ListView(
        children: [
          const Text('Detalles del reporte', style: TextStyle(fontSize: 32, fontWeight: FontWeight.w800, color: _textPrimary)),
          const SizedBox(height: 8),
          const Text(
            'Proporciona información específica sobre lo sucedido.',
            style: TextStyle(fontSize: 15, color: _textSecondary),
          ),
          const SizedBox(height: 20),
          DropdownButtonFormField<int>(
            value: _areaId,
            decoration: _mobileInputDecoration('Área'),
            items: _filteredAreas
                .map((a) => DropdownMenuItem<int>(value: a['id'] as int?, child: Text(a['name'] as String? ?? 'Área')))
                .toList(growable: false),
            onChanged: _branchId == null
                ? null
                : (value) {
                    setState(() {
                      _areaId = value;
                      _dispenserId = null;
                    });
                  },
          ),
          const SizedBox(height: 12),
          DropdownButtonFormField<int>(
            value: _dispenserId,
            decoration: _mobileInputDecoration('Dispensador'),
            items: _filteredDispensers
                .map((d) => DropdownMenuItem<int>(value: d['id'] as int?, child: Text(d['identifier'] as String? ?? 'Dispensador')))
                .toList(growable: false),
            onChanged: _areaId == null ? null : (value) => setState(() => _dispenserId = value),
          ),
          const SizedBox(height: 12),
          TextField(
            controller: _descriptionController,
            minLines: 4,
            maxLines: 6,
            onChanged: (_) => setState(() {}),
            decoration: _mobileInputDecoration('Descripción').copyWith(
              hintText: 'Escribe los detalles aquí...',
              alignLabelWithHint: true,
            ),
          ),
        ],
      );
    }

    return ListView(
      children: [
        const Text('Adjuntar evidencia', style: TextStyle(fontSize: 32, fontWeight: FontWeight.w800, color: _textPrimary)),
        const SizedBox(height: 8),
        const Text(
          'Añade fotos para respaldar el reporte técnico.',
          style: TextStyle(fontSize: 15, color: _textSecondary),
        ),
        const SizedBox(height: 18),
        InkWell(
          onTap: _evidenceFiles.length >= 4 ? null : _captureEvidence,
          borderRadius: BorderRadius.circular(16),
          child: Ink(
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: const Color(0xFFCBD5E1)),
            ),
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 18),
            child: Column(
              children: [
                Container(
                  width: 52,
                  height: 52,
                  decoration: const BoxDecoration(color: Color(0xFFF1F5F9), shape: BoxShape.circle),
                  child: const Icon(Icons.photo_camera_outlined, color: Color(0xFF475569), size: 28),
                ),
                const SizedBox(height: 10),
                Text(
                  _evidenceFiles.length >= 4 ? 'Límite de evidencias alcanzado' : 'Tomar evidencia con cámara',
                  style: const TextStyle(color: _primaryColor, fontWeight: FontWeight.w700, fontSize: 16),
                ),
                const SizedBox(height: 6),
                const Text(
                  'Captura una foto directamente en el flujo\n(máx. 4 imágenes)',
                  textAlign: TextAlign.center,
                  style: TextStyle(color: _textSecondary, fontSize: 12),
                ),
              ],
            ),
          ),
        ),
        const SizedBox(height: 14),
        if (_evidenceFiles.isEmpty)
          const Text('No has agregado evidencias aún.', style: TextStyle(color: _textSecondary))
        else
          GridView.builder(
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            itemCount: _evidenceFiles.length,
            gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
              crossAxisCount: 2,
              crossAxisSpacing: 10,
              mainAxisSpacing: 10,
              childAspectRatio: 1.25,
            ),
            itemBuilder: (context, index) {
              final file = _evidenceFiles[index];
              return Stack(
                fit: StackFit.expand,
                children: [
                  ClipRRect(
                    borderRadius: BorderRadius.circular(12),
                    child: Image.file(file, fit: BoxFit.cover),
                  ),
                  Positioned(
                    right: 6,
                    top: 6,
                    child: IconButton.filled(
                      onPressed: () => setState(() => _evidenceFiles.removeAt(index)),
                      icon: const Icon(Icons.close, size: 14),
                      style: IconButton.styleFrom(
                        minimumSize: const Size(24, 24),
                        backgroundColor: Colors.black87,
                        foregroundColor: Colors.white,
                        padding: EdgeInsets.zero,
                      ),
                    ),
                  ),
                ],
              );
            },
          ),
      ],
    );
  }
}

class _IncidentCameraScreen extends StatefulWidget {
  const _IncidentCameraScreen({required this.camera});

  final CameraDescription camera;

  @override
  State<_IncidentCameraScreen> createState() => _IncidentCameraScreenState();
}

class _IncidentCameraScreenState extends State<_IncidentCameraScreen> {
  CameraController? _controller;
  bool _ready = false;
  bool _capturing = false;

  @override
  void initState() {
    super.initState();
    _initCamera();
  }

  @override
  void dispose() {
    _controller?.dispose();
    super.dispose();
  }

  Future<void> _initCamera() async {
    final controller = CameraController(widget.camera, ResolutionPreset.medium, enableAudio: false);
    try {
      await controller.initialize();
      if (!mounted) {
        await controller.dispose();
        return;
      }
      setState(() {
        _controller = controller;
        _ready = true;
      });
    } catch (_) {
      if (mounted) {
        Navigator.of(context).pop();
      }
    }
  }

  Future<void> _takePicture() async {
    final controller = _controller;
    if (controller == null || !_ready || _capturing) return;

    setState(() => _capturing = true);
    try {
      final photo = await controller.takePicture();
      if (!mounted) return;
      Navigator.of(context).pop(File(photo.path));
    } catch (_) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('No se pudo capturar la foto.')),
      );
    } finally {
      if (mounted) {
        setState(() => _capturing = false);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.black,
      appBar: AppBar(backgroundColor: Colors.black, foregroundColor: Colors.white),
      body: !_ready
          ? const Center(child: CircularProgressIndicator())
          : Stack(
              children: [
                Positioned.fill(child: CameraPreview(_controller!)),
                Positioned(
                  bottom: 24,
                  left: 0,
                  right: 0,
                  child: Center(
                    child: FloatingActionButton(
                      onPressed: _takePicture,
                      child: _capturing
                          ? const SizedBox(
                              width: 22,
                              height: 22,
                              child: CircularProgressIndicator(strokeWidth: 2),
                            )
                          : const Icon(Icons.camera_alt),
                    ),
                  ),
                ),
              ],
            ),
    );
  }
}
