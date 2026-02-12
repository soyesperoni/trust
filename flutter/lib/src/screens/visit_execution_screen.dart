import 'dart:typed_data';

import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:geolocator/geolocator.dart';
import 'package:image_picker/image_picker.dart';
import 'package:latlong2/latlong.dart';
import 'package:permission_handler/permission_handler.dart';
import 'package:signature/signature.dart';

import '../models/visit.dart';
import '../theme/app_colors.dart';

class VisitExecutionScreen extends StatefulWidget {
  const VisitExecutionScreen({required this.visit, super.key});

  final Visit visit;

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

  int _step = 1;
  Position? _currentPosition;
  bool _locationValidated = false;
  bool _isRequestingPermissions = false;
  bool _locationCheck = false;
  final Set<String> _checkedItems = <String>{};
  final List<XFile> _evidenceFiles = <XFile>[];

  static const _checklistItems = [
    ('Dosificador Jabón #1', 'Entrada principal'),
    ('Dosificador Gel #1', 'Mostrador atención'),
    ('Dosificador Jabón #2', 'Baños hombres'),
    ('Toallas Papel #1', 'Baños hombres'),
    ('Dosificador Jabón #3', 'Baños mujeres'),
  ];

  @override
  void dispose() {
    _signatureController.dispose();
    _commentsController.dispose();
    _responsibleNameController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final progress = _step / 4;

    return Scaffold(
      appBar: AppBar(title: const Text('Realizar visita')),
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.fromLTRB(20, 12, 20, 20),
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
              LinearProgressIndicator(value: progress, color: AppColors.yellow, backgroundColor: AppColors.gray200),
              const SizedBox(height: 20),
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
    final center = _currentPosition == null
        ? const LatLng(-12.046374, -77.042793)
        : LatLng(_currentPosition!.latitude, _currentPosition!.longitude);

    return ListView(
      children: [
        Text('${widget.visit.client} · ${widget.visit.branch}', style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 18)),
        const SizedBox(height: 6),
        Text(widget.visit.area, style: const TextStyle(color: AppColors.gray500)),
        const SizedBox(height: 16),
        ClipRRect(
          borderRadius: BorderRadius.circular(16),
          child: SizedBox(
            height: 240,
            child: FlutterMap(
              options: MapOptions(initialCenter: center, initialZoom: _currentPosition == null ? 14 : 17),
              children: [
                TileLayer(
                  urlTemplate: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
                  userAgentPackageName: 'com.trust.mobile',
                ),
                if (_currentPosition != null)
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
        const SizedBox(height: 16),
        FilledButton.icon(
          onPressed: _isRequestingPermissions ? null : _validateCurrentLocation,
          icon: const Icon(Icons.near_me_rounded),
          label: Text(_isRequestingPermissions ? 'Validando...' : 'Validar Ubicación'),
        ),
        if (_locationValidated)
          const Padding(
            padding: EdgeInsets.only(top: 10),
            child: Text('Ubicación validada correctamente.', style: TextStyle(color: Colors.green)),
          ),
      ],
    );
  }

  Widget _buildChecklistStep() {
    return ListView.separated(
      itemCount: _checklistItems.length,
      separatorBuilder: (_, _) => const SizedBox(height: 10),
      itemBuilder: (_, index) {
        final item = _checklistItems[index];
        final id = '${item.$1}-${item.$2}';
        return CheckboxListTile(
          value: _checkedItems.contains(id),
          onChanged: (value) {
            setState(() {
              if (value ?? false) {
                _checkedItems.add(id);
              } else {
                _checkedItems.remove(id);
              }
            });
          },
          contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14), side: const BorderSide(color: AppColors.gray200)),
          title: Text(item.$1, style: const TextStyle(fontWeight: FontWeight.w600)),
          subtitle: Text(item.$2),
        );
      },
    );
  }

  Widget _buildEvidenceStep() {
    return ListView(
      children: [
        TextField(
          controller: _commentsController,
          maxLines: 5,
          decoration: const InputDecoration(labelText: 'Comentarios', hintText: 'Describe los hallazgos encontrados...'),
        ),
        const SizedBox(height: 16),
        OutlinedButton.icon(
          onPressed: _pickEvidence,
          icon: const Icon(Icons.add_a_photo_outlined),
          label: const Text('Agregar evidencia'),
        ),
        const SizedBox(height: 10),
        ..._evidenceFiles.map((file) => ListTile(
              dense: true,
              contentPadding: EdgeInsets.zero,
              leading: const Icon(Icons.image_outlined),
              title: Text(file.name, maxLines: 1, overflow: TextOverflow.ellipsis),
            )),
        const SizedBox(height: 8),
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
        const Text('Firma del Responsable', style: TextStyle(fontWeight: FontWeight.w700)),
        const SizedBox(height: 10),
        Container(
          height: 220,
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
        const SizedBox(height: 10),
        TextField(
          controller: _responsibleNameController,
          decoration: const InputDecoration(labelText: 'Nombre del Responsable', hintText: 'Ej. Juan Pérez'),
        ),
      ],
    );
  }

  Widget _buildFooter() {
    final canContinue = switch (_step) {
      1 => _locationValidated,
      2 => _checkedItems.isNotEmpty,
      3 => _locationCheck,
      _ => _responsibleNameController.text.trim().isNotEmpty,
    };

    return Row(
      children: [
        if (_step > 1)
          Expanded(
            child: OutlinedButton(
              onPressed: () => setState(() => _step -= 1),
              child: const Text('Atrás'),
            ),
          ),
        if (_step > 1) const SizedBox(width: 10),
        Expanded(
          flex: 2,
          child: FilledButton(
            onPressed: canContinue ? _next : null,
            child: Text(_step == 4 ? 'Finalizar y Enviar Visita' : 'Siguiente'),
          ),
        ),
      ],
    );
  }

  Future<void> _validateCurrentLocation() async {
    setState(() => _isRequestingPermissions = true);

    final locationPermission = await Permission.locationWhenInUse.request();
    final cameraPermission = await Permission.camera.request();

    if (!mounted) return;

    if (!locationPermission.isGranted || !cameraPermission.isGranted) {
      setState(() => _isRequestingPermissions = false);
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Debes otorgar permisos de cámara y ubicación para iniciar la visita.')),
      );
      return;
    }

    final enabled = await Geolocator.isLocationServiceEnabled();
    if (!enabled) {
      setState(() => _isRequestingPermissions = false);
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Activa el servicio de ubicación para continuar.')),
      );
      return;
    }

    final position = await Geolocator.getCurrentPosition();
    if (!mounted) return;
    setState(() {
      _currentPosition = position;
      _locationValidated = true;
      _isRequestingPermissions = false;
    });
  }

  Future<void> _pickEvidence() async {
    final images = await _imagePicker.pickMultiImage(imageQuality: 80);
    if (images.isEmpty) {
      return;
    }
    setState(() {
      _evidenceFiles.addAll(images);
    });
  }

  Future<void> _next() async {
    if (_step < 4) {
      setState(() => _step += 1);
      return;
    }

    final signatureBytes = await _signatureController.toPngBytes();
    if (!mounted) return;
    if (signatureBytes == null || signatureBytes.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Debes registrar la firma para finalizar.')));
      return;
    }

    _showCompletionMessage(signatureBytes);
  }

  void _showCompletionMessage(Uint8List signatureBytes) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(
          'Visita #${widget.visit.id} finalizada con ${_evidenceFiles.length} evidencias y firma registrada (${signatureBytes.lengthInBytes} bytes).',
        ),
      ),
    );
    Navigator.of(context).pop();
  }
}
