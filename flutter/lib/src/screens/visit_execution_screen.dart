import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:geolocator/geolocator.dart';
import 'package:http/http.dart' as http;
import 'package:image_picker/image_picker.dart';
import 'package:latlong2/latlong.dart';
import 'package:permission_handler/permission_handler.dart';
import 'package:signature/signature.dart';

import '../models/visit.dart';
import '../services/trust_repository.dart';
import '../theme/app_colors.dart';

class VisitExecutionScreen extends StatefulWidget {
  const VisitExecutionScreen({required this.visit, required this.email, super.key});

  final Visit visit;
  final String email;

  @override
  State<VisitExecutionScreen> createState() => _VisitExecutionScreenState();
}

class _VisitExecutionScreenState extends State<VisitExecutionScreen> {
  final SignatureController _signatureController = SignatureController(
    penStrokeWidth: 2,
    penColor: const Color(0xFF111827),
  );
  final TextEditingController _commentsController = TextEditingController();
  final TextEditingController _responsibleNameController = TextEditingController();
  final ImagePicker _imagePicker = ImagePicker();
  final TrustRepository _repository = TrustRepository();

  static const int _maxEvidenceItems = 4;

  int _step = 1;
  bool _loading = true;
  bool _isSubmitting = false;
  String? _error;

  Visit? _visit;
  Position? _startPosition;
  bool _locationValidated = false;
  bool _locationCheck = false;
  final List<_ChecklistDispenser> _checklistDispensers = <_ChecklistDispenser>[];
  final List<XFile> _evidenceFiles = <XFile>[];
  _EvidenceMode _evidenceMode = _EvidenceMode.photo;

  @override
  void initState() {
    super.initState();
    _loadData();
  }

  @override
  void dispose() {
    _signatureController.dispose();
    _commentsController.dispose();
    _responsibleNameController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final progress = _step * 0.25;

    return Scaffold(
      appBar: AppBar(title: const Text('Realizar visita')),
      body: SafeArea(
        child: _loading
            ? const Center(child: CircularProgressIndicator())
            : Padding(
                padding: const EdgeInsets.fromLTRB(16, 12, 16, 16),
                child: Column(
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text('Paso $_step de 4', style: const TextStyle(fontWeight: FontWeight.w700, color: AppColors.yellowDark)),
                        Text('${(progress * 100).round()}%', style: const TextStyle(color: AppColors.gray500)),
                      ],
                    ),
                    const SizedBox(height: 8),
                    LinearProgressIndicator(value: progress, color: AppColors.yellow, backgroundColor: AppColors.gray300),
                    if (_error != null) ...[
                      const SizedBox(height: 12),
                      Container(
                        width: double.infinity,
                        padding: const EdgeInsets.all(10),
                        decoration: BoxDecoration(color: const Color(0xFFFEE2E2), borderRadius: BorderRadius.circular(10)),
                        child: Text(_error!, style: const TextStyle(color: Color(0xFFB91C1C))),
                      ),
                    ],
                    const SizedBox(height: 14),
                    Expanded(child: _buildStep()),
                    const SizedBox(height: 12),
                    _buildFooter(),
                  ],
                ),
              ),
      ),
    );
  }

  Widget _buildStep() {
    switch (_step) {
      case 1:
        return _buildLocationStep();
      case 2:
        return _buildChecklistStep();
      case 3:
        return _buildEvidenceStep();
      default:
        return _buildSignatureStep();
    }
  }

  Widget _buildLocationStep() {
    final visit = _visit ?? widget.visit;
    final center = _startPosition == null
        ? const LatLng(-12.046374, -77.042793)
        : LatLng(_startPosition!.latitude, _startPosition!.longitude);

    return ListView(
      children: [
        const Text('Iniciar Visita', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 24)),
        const SizedBox(height: 4),
        const Text('Valida tu ubicación para comenzar la inspección.', style: TextStyle(color: AppColors.gray500)),
        const SizedBox(height: 12),
        _infoCard(visit),
        const SizedBox(height: 12),
        ClipRRect(
          borderRadius: BorderRadius.circular(16),
          child: SizedBox(
            height: 220,
            child: FlutterMap(
              options: MapOptions(initialCenter: center, initialZoom: _startPosition == null ? 14 : 17),
              children: [
                TileLayer(
                  urlTemplate: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
                  userAgentPackageName: 'com.trust.mobile',
                ),
                if (_startPosition != null)
                  MarkerLayer(
                    markers: [
                      Marker(
                        point: center,
                        width: 44,
                        height: 44,
                        child: const Icon(Icons.location_on, color: AppColors.yellowDark, size: 36),
                      ),
                    ],
                  ),
              ],
            ),
          ),
        ),
        const SizedBox(height: 12),
        FilledButton(
          onPressed: _isSubmitting ? null : _onStartVisit,
          child: Text(_isSubmitting ? 'Validando...' : 'Validar ubicación'),
        ),
      ],
    );
  }

  Widget _infoCard(Visit visit) {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(16), border: Border.all(color: AppColors.gray300)),
      child: Column(
        children: [
          _kvRow('Hora', _formatTime(visit.visitedAt), isHeader: true),
          const Divider(height: 18),
          _kvRow('Cliente', visit.client),
          _kvRow('Sucursal', visit.branch),
          _kvRow('Área', visit.area),
        ],
      ),
    );
  }

  Widget _kvRow(String key, String value, {bool isHeader = false}) {
    return Row(
      children: [
        SizedBox(width: 80, child: Text(key, style: TextStyle(color: AppColors.gray500, fontWeight: isHeader ? FontWeight.w700 : FontWeight.w500))),
        Expanded(child: Text(value, style: const TextStyle(fontWeight: FontWeight.w700))),
      ],
    );
  }

  Widget _buildChecklistStep() {
    return ListView(
      children: [
        const Text('Revisión de Dosificadores', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 24)),
        const SizedBox(height: 4),
        const Text('Marca cada elemento verificado en el área.', style: TextStyle(color: AppColors.gray500)),
        const SizedBox(height: 12),
        ..._checklistDispensers.map(
          (item) => Container(
            margin: const EdgeInsets.only(bottom: 10),
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(color: AppColors.gray50, borderRadius: BorderRadius.circular(14), border: Border.all(color: AppColors.gray300)),
            child: Row(
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(item.identifier, style: const TextStyle(fontWeight: FontWeight.w700)),
                      const SizedBox(height: 2),
                      Text(item.location, style: const TextStyle(color: AppColors.gray500, fontSize: 12)),
                    ],
                  ),
                ),
                Checkbox(
                  value: item.checked,
                  onChanged: (value) {
                    setState(() => item.checked = value ?? false);
                  },
                ),
              ],
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildEvidenceStep() {
    return ListView(
      children: [
        const Text('Hallazgos y Evidencias', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 24)),
        const SizedBox(height: 4),
        const Text('Registra comentarios y captura evidencias de la inspección.', style: TextStyle(color: AppColors.gray500)),
        const SizedBox(height: 12),
        TextField(
          controller: _commentsController,
          maxLines: 4,
          decoration: const InputDecoration(labelText: 'Comentarios', hintText: 'Escribe observaciones de la visita...'),
        ),
        const SizedBox(height: 12),
        Row(
          children: [
            Expanded(
              child: OutlinedButton(
                onPressed: () => setState(() => _evidenceMode = _EvidenceMode.photo),
                child: Text('Foto', style: TextStyle(color: _evidenceMode == _EvidenceMode.photo ? AppColors.black : AppColors.gray500)),
              ),
            ),
            const SizedBox(width: 8),
            Expanded(
              child: OutlinedButton(
                onPressed: () => setState(() => _evidenceMode = _EvidenceMode.video),
                child: Text('Video', style: TextStyle(color: _evidenceMode == _EvidenceMode.video ? AppColors.black : AppColors.gray500)),
              ),
            ),
          ],
        ),
        const SizedBox(height: 10),
        OutlinedButton.icon(
          onPressed: _pickEvidence,
          icon: const Icon(Icons.add_a_photo_outlined),
          label: const Text('Agregar evidencia'),
        ),
        const SizedBox(height: 10),
        ..._evidenceFiles.asMap().entries.map(
          (entry) => ListTile(
            dense: true,
            contentPadding: EdgeInsets.zero,
            leading: Icon(entry.value.path.toLowerCase().endsWith('.mp4') ? Icons.videocam_outlined : Icons.image_outlined),
            title: Text(entry.value.name, maxLines: 1, overflow: TextOverflow.ellipsis),
            trailing: IconButton(
              onPressed: () => setState(() => _evidenceFiles.removeAt(entry.key)),
              icon: const Icon(Icons.delete_outline),
            ),
          ),
        ),
        CheckboxListTile(
          value: _locationCheck,
          onChanged: (value) => setState(() => _locationCheck = value ?? false),
          title: const Text('Verificación de ubicación'),
          subtitle: const Text('Confirmo que me encuentro físicamente en el sitio de inspección.'),
          contentPadding: EdgeInsets.zero,
        ),
      ],
    );
  }

  Widget _buildSignatureStep() {
    return ListView(
      children: [
        const Text('Finalizar Inspección', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 24)),
        const SizedBox(height: 4),
        const Text('Firma del responsable del área.', style: TextStyle(color: AppColors.gray500)),
        const SizedBox(height: 12),
        Container(
          height: 210,
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(14),
            border: Border.all(color: AppColors.gray300),
            color: AppColors.gray50,
          ),
          child: Signature(controller: _signatureController, backgroundColor: Colors.transparent),
        ),
        Align(
          alignment: Alignment.centerRight,
          child: TextButton(onPressed: _signatureController.clear, child: const Text('Limpiar firma')),
        ),
        TextField(
          controller: _responsibleNameController,
          decoration: const InputDecoration(labelText: 'Nombre del Responsable', hintText: 'Ej. Juan Pérez'),
        ),
      ],
    );
  }

  Widget _buildFooter() {
    final allDispensersChecked = _checklistDispensers.isEmpty || _checklistDispensers.every((item) => item.checked);
    final canContinue = switch (_step) {
      1 => _locationValidated,
      2 => allDispensersChecked,
      3 => _locationCheck,
      _ => true,
    };

    return Row(
      children: [
        Expanded(
          child: OutlinedButton(
            onPressed: _isSubmitting
                ? null
                : () {
                    if (_step == 1) {
                      Navigator.of(context).pop();
                      return;
                    }
                    setState(() => _step -= 1);
                  },
            child: Text(_step == 1 ? 'Cancelar' : 'Atrás'),
          ),
        ),
        const SizedBox(width: 8),
        Expanded(
          child: FilledButton(
            onPressed: !_isSubmitting && canContinue ? _next : null,
            child: Text(_step == 4 ? (_isSubmitting ? 'Finalizando...' : 'Finalizar visita') : 'Siguiente'),
          ),
        ),
      ],
    );
  }

  Future<void> _loadData() async {
    try {
      final visit = await _repository.loadVisitById(widget.email, widget.visit.id);
      final dispensers = await _repository.loadDispensers(widget.email);
      final areaDispensers = dispensers.where((item) {
        final area = item['area'];
        return area is Map<String, dynamic> && area['id'] == visit.areaId;
      }).toList();

      if (!mounted) return;
      setState(() {
        _visit = visit;
        _checklistDispensers
          ..clear()
          ..addAll(
            areaDispensers.map(
              (item) => _ChecklistDispenser(
                id: item['id'] as int? ?? 0,
                identifier: item['identifier'] as String? ?? 'Dosificador',
                location: (item['area'] as Map<String, dynamic>?)?['name'] as String? ?? visit.area,
              ),
            ),
          );
      });
    } catch (error) {
      if (!mounted) return;
      setState(() => _error = error.toString());
    } finally {
      if (mounted) {
        setState(() => _loading = false);
      }
    }
  }

  Future<void> _onStartVisit() async {
    try {
      setState(() {
        _error = null;
        _isSubmitting = true;
      });
      await _requestMediaPermissions(requireMicrophone: false);
      final position = await _validatePhoneLocation();
      await _repository.startVisit(
        email: widget.email,
        visitId: widget.visit.id,
        latitude: position.latitude,
        longitude: position.longitude,
      );
      if (!mounted) return;
      setState(() {
        _startPosition = position;
        _locationValidated = true;
      });
    } catch (error) {
      if (!mounted) return;
      setState(() => _error = _toError(error));
    } finally {
      if (mounted) setState(() => _isSubmitting = false);
    }
  }

  Future<void> _pickEvidence() async {
    if (_evidenceFiles.length >= _maxEvidenceItems) {
      setState(() => _error = 'Solo puedes adjuntar hasta $_maxEvidenceItems evidencias.');
      return;
    }

    try {
      final XFile? file;
      if (_evidenceMode == _EvidenceMode.photo) {
        file = await _imagePicker.pickImage(source: ImageSource.camera, imageQuality: 80);
      } else {
        file = await _imagePicker.pickVideo(source: ImageSource.camera, maxDuration: const Duration(seconds: 60));
      }
      if (file == null) return;
      final selectedFile = file;

      setState(() {
        _error = null;
        _evidenceFiles.add(selectedFile);
      });
    } catch (error) {
      setState(() => _error = _toError(error));
    }
  }

  Future<void> _next() async {
    if (_step < 4) {
      final targetStep = _step + 1;
      try {
        if (targetStep == 3) {
          await _requestMediaPermissions(requireMicrophone: true);
        }
        if (targetStep == 4) {
          await _validatePhoneLocation();
        }
        if (!mounted) return;
        setState(() {
          _error = null;
          _step = targetStep;
        });
      } catch (error) {
        if (!mounted) return;
        setState(() => _error = _toError(error));
      }
      return;
    }

    await _finishVisit();
  }

  Future<void> _finishVisit() async {
    final messenger = ScaffoldMessenger.of(context);

    try {
      setState(() {
        _error = null;
        _isSubmitting = true;
      });

      final signatureBytes = await _signatureController.toPngBytes();
      if (signatureBytes == null || signatureBytes.isEmpty) {
        throw Exception('Debes registrar la firma del responsable para finalizar.');
      }

      final responsibleName = _responsibleNameController.text.trim();
      if (responsibleName.isEmpty) {
        throw Exception('Debes registrar el nombre del responsable para finalizar.');
      }
      if (!_locationCheck) {
        throw Exception('Debes confirmar tu ubicación en sitio para finalizar la visita.');
      }

      final endPosition = await _validatePhoneLocation();
      final checklist = _checklistDispensers
          .map((item) => {
                'id': 'dispenser-${item.id}',
                'label': item.identifier,
                'location': item.location,
                'checked': item.checked,
                'photo': null,
              })
          .toList(growable: false);

      final files = await Future.wait(
        _evidenceFiles.map(
          (file) async => http.MultipartFile.fromBytes(
            'evidence_files',
            await file.readAsBytes(),
            filename: file.name,
          ),
        ),
      );

      await _repository.completeVisit(
        email: widget.email,
        visitId: widget.visit.id,
        latitude: endPosition.latitude,
        longitude: endPosition.longitude,
        visitReport: {
          'checklist': checklist,
          'comments': _commentsController.text.trim(),
          'location_verified': _locationCheck,
          'responsible_name': responsibleName,
          'responsible_signature': 'data:image/png;base64,${base64Encode(signatureBytes)}',
        },
        evidenceFiles: files,
      );

      if (!mounted) return;
      messenger.showSnackBar(const SnackBar(content: Text('Visita finalizada correctamente.')));
      Navigator.of(context).pop();
    } catch (error) {
      if (!mounted) return;
      setState(() => _error = _toError(error));
    } finally {
      if (mounted) setState(() => _isSubmitting = false);
    }
  }

  Future<void> _requestMediaPermissions({required bool requireMicrophone}) async {
    final cameraPermission = await Permission.camera.request();
    final locationPermission = await Permission.locationWhenInUse.request();
    final microphonePermission = requireMicrophone ? await Permission.microphone.request() : PermissionStatus.granted;

    if (!cameraPermission.isGranted || !locationPermission.isGranted || !microphonePermission.isGranted) {
      throw Exception('Debes otorgar permisos para cámara, ubicación y micrófono para continuar.');
    }
  }

  Future<Position> _validatePhoneLocation() async {
    final enabled = await Geolocator.isLocationServiceEnabled();
    if (!enabled) {
      throw Exception('Activa el servicio de ubicación para continuar.');
    }

    const locationSettings = LocationSettings(accuracy: LocationAccuracy.high);
    return Geolocator.getCurrentPosition(locationSettings: locationSettings);
  }

  String _formatTime(String input) {
    final date = DateTime.tryParse(input)?.toLocal();
    if (date == null) return '--:--';
    final hour = date.hour.toString().padLeft(2, '0');
    final minute = date.minute.toString().padLeft(2, '0');
    return '$hour:$minute';
  }

  String _toError(Object error) {
    final message = error.toString();
    return message.startsWith('Exception: ') ? message.replaceFirst('Exception: ', '') : message;
  }
}

class _ChecklistDispenser {
  _ChecklistDispenser({required this.id, required this.identifier, required this.location});

  final int id;
  final String identifier;
  final String location;
  bool checked = false;
}

enum _EvidenceMode { photo, video }
