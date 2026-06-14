import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
	Alert,
	Box,
	Button,
	Card,
	CardContent,
	Chip,
	CircularProgress,
	Container,
	Dialog,
	DialogActions,
	DialogContent,
	DialogTitle,
	Divider,
	Grid,
	IconButton,
	MenuItem,
	Paper,
	Stack,
	Table,
	TableBody,
	TableCell,
	TableContainer,
	TableHead,
	TablePagination,
	TableRow,
	TextField,
	Tooltip,
	Typography
} from '@mui/material';
import {
	Add as AddIcon,
	AutoAwesome as AutoAwesomeIcon,
	Delete as DeleteIcon,
	Edit as EditIcon,
	Image as ImageIcon,
	PictureAsPdf as PictureAsPdfIcon,
	Refresh as RefreshIcon,
	RemoveRedEye as RemoveRedEyeIcon,
	Save as SaveIcon,
	Search as SearchIcon,
	UploadFile as UploadFileIcon
} from '@mui/icons-material';
import toast from 'react-hot-toast';
import api from '../services/api';

const FORM_INITIAL_STATE = {
	datum: new Date().toISOString().slice(0, 10),
	typ: 'einkauf',
	beschreibung: '',
	betrag: '',
	referenznummer: '',
	steuerlaufnummer: '',
	rechnungsteller: '',
	bankdaten: '',
	notizen: '',
	quelle: 'einzeln',
	image_url: null,
	dokument_url: null,
	positionen: []
};

const SUMMARY_INITIAL_STATE = {
	totalEinnahmen: 0,
	totalEinkauf: 0,
	totalMaterial: 0,
	totalArbeit: 0,
	totalSonstiges: 0,
	nettoEinnahmen: 0,
	bilanz: 0
};

const TRANSACTION_TYPES = [
	{ value: 'einnahme', label: 'Einnahme' },
	{ value: 'einkauf', label: 'Einkauf' },
	{ value: 'material', label: 'Material' },
	{ value: 'arbeit', label: 'Arbeit' },
	{ value: 'sonstiges', label: 'Sonstiges' }
];

const formatCurrency = (amount) => {
	const value = Number(amount || 0);
	return new Intl.NumberFormat('de-DE', {
		style: 'currency',
		currency: 'EUR'
	}).format(value);
};

const formatDate = (value) => {
	if (!value) {
		return '-';
	}

	const date = new Date(value);
	if (Number.isNaN(date.getTime())) {
		return '-';
	}

	return date.toLocaleDateString('de-DE');
};

const shortId = (id) => (id ? String(id).slice(-8).toUpperCase() : '-');

const toNumber = (value) => {
	const parsed = Number.parseFloat(String(value).replace(',', '.'));
	return Number.isFinite(parsed) ? parsed : 0;
};

const detectOpenReceivable = (entry) => {
	const text = [
		entry?.notizen,
		entry?.beschreibung,
		entry?.referenznummer
	]
		.filter(Boolean)
		.join(' ')
		.toLowerCase();

	if (!text) {
		return false;
	}

	if (text.includes('bezahlt') || text.includes('paid')) {
		return false;
	}

	return ['offen', 'unbezahlt', 'fällig', 'faellig', 'pending', 'mahnung'].some((keyword) =>
		text.includes(keyword)
	);
};

const AdminGuV = () => {
	const fileInputRef = useRef(null);
	const requestRef = useRef(0);

	const [guvRechnungen, setGuvRechnungen] = useState([]);
	const [summary, setSummary] = useState({
		...SUMMARY_INITIAL_STATE
	});
	const [invoiceStats, setInvoiceStats] = useState({
		paidIncome: 0,
		openReceivables: 0,
		openReceivablesCount: null,
		paidReceiptsCount: null,
		totalIncomeCount: null,
		totalExpenses: 0,
		breakEvenPoint: 0
	});
	const [formData, setFormData] = useState(FORM_INITIAL_STATE);
	const [pagination, setPagination] = useState({
		page: 0,
		rowsPerPage: 20,
		total: 0
	});
	const [filters, setFilters] = useState({
		geschaeftsjahr: new Date().getFullYear(),
		typ: ''
	});
	const [loading, setLoading] = useState({
		list: false,
		summary: false,
		save: false,
		analyze: false,
		delete: false,
		sequence: false
	});
	const [errors, setErrors] = useState({
		list: '',
		form: '',
		analyze: ''
	});
	const [dialogOpen, setDialogOpen] = useState(false);
	const [editingEntry, setEditingEntry] = useState(null);
	const [selectedFile, setSelectedFile] = useState(null);
	const [localPreview, setLocalPreview] = useState({
		imageUrl: '',
		pdfUrl: ''
	});
	const [viewer, setViewer] = useState({
		open: false,
		type: '',
		url: '',
		title: ''
	});

	const totalExpenses = useMemo(
		() =>
			toNumber(summary.totalEinkauf) +
			toNumber(summary.totalMaterial) +
			toNumber(summary.totalArbeit) +
			toNumber(summary.totalSonstiges),
		[summary.totalArbeit, summary.totalEinkauf, summary.totalMaterial, summary.totalSonstiges]
	);

	const applyInvoiceStats = useCallback(
		(incomes = []) => {
			const openEntries = incomes.filter(detectOpenReceivable);
			const openReceivables = openEntries.reduce((acc, item) => acc + toNumber(item.betrag), 0);
			const paidIncome = Math.max(0, toNumber(summary.totalEinnahmen) - openReceivables);

			setInvoiceStats({
				paidIncome,
				openReceivables,
				openReceivablesCount: openEntries.length,
				paidReceiptsCount: Math.max(0, incomes.length - openEntries.length),
				totalIncomeCount: incomes.length,
				totalExpenses,
				breakEvenPoint: paidIncome - totalExpenses
			});
		},
		[summary.totalEinnahmen, totalExpenses]
	);

	const loadInvoiceStats = useCallback(async () => {
		try {
			setLoading((prev) => ({ ...prev, summary: true }));

			// Primäre Quelle: zentrale Rechnungsstatistik (bezahlt/offen)
			const statsResponse = await api.get('/admin/invoices/stats');
			const statsData = statsResponse?.data?.data;

			if (statsResponse?.data?.success && statsData) {
				const paidIncome = toNumber(statsData.paidAmount);
				const openReceivables = toNumber(statsData.pendingAmount);
				const totalIncomeCount = Number.isFinite(Number(statsData.totalInvoices))
					? Number(statsData.totalInvoices)
					: null;

				setInvoiceStats({
					paidIncome,
					openReceivables,
					openReceivablesCount: null,
					paidReceiptsCount: null,
					totalIncomeCount,
					totalExpenses,
					breakEvenPoint: paidIncome - totalExpenses
				});
				return;
			}

			// Fallback auf bisherige GuV-Logik, falls die Statistik-API keine Nutzdaten liefert
			const response = await api.get('/guv-rechnung', {
				params: {
					geschaeftsjahr: filters.geschaeftsjahr,
					typ: 'einnahme',
					skip: 0,
					limit: 5000
				}
			});

			const incomes = response?.data?.data || [];
			applyInvoiceStats(incomes);
		} catch (error) {
			// Fallback: GuV-Einnahmen aus derselben Seite verwenden
			try {
				const response = await api.get('/guv-rechnung', {
					params: {
						geschaeftsjahr: filters.geschaeftsjahr,
						typ: 'einnahme',
						skip: 0,
						limit: 5000
					}
				});

				const incomes = response?.data?.data || [];
				applyInvoiceStats(incomes);
			} catch (fallbackError) {
				applyInvoiceStats([]);
				console.error('Fehler beim Fallback der Forderungsstatistik:', fallbackError);
			}
			console.error('Fehler beim Laden der Forderungsstatistik:', error);
		} finally {
			setLoading((prev) => ({ ...prev, summary: false }));
		}
	}, [applyInvoiceStats, filters.geschaeftsjahr]);

	const loadGuvRechnungen = useCallback(async () => {
		const currentRequest = Date.now();
		requestRef.current = currentRequest;

		try {
			setLoading((prev) => ({ ...prev, list: true }));
			setErrors((prev) => ({ ...prev, list: '' }));

			const params = {
				skip: pagination.page * pagination.rowsPerPage,
				limit: pagination.rowsPerPage,
				geschaeftsjahr: filters.geschaeftsjahr
			};

			if (filters.typ) {
				params.typ = filters.typ;
			}

			const response = await api.get('/guv-rechnung', { params });

			if (requestRef.current !== currentRequest) {
				return;
			}

			setGuvRechnungen(response?.data?.data || []);
			setSummary(response?.data?.summary || SUMMARY_INITIAL_STATE);
			setPagination((prev) => ({
				...prev,
				total: response?.data?.pagination?.total || 0
			}));
		} catch (error) {
			console.error('Fehler beim Laden der GuV-Rechnungen:', error);
			setErrors((prev) => ({
				...prev,
				list: error?.response?.data?.message || 'GuV-Rechnungen konnten nicht geladen werden.'
			}));
		} finally {
			if (requestRef.current === currentRequest) {
				setLoading((prev) => ({ ...prev, list: false }));
			}
		}
	}, [filters.geschaeftsjahr, filters.typ, pagination.page, pagination.rowsPerPage]);

	useEffect(() => {
		loadGuvRechnungen();
	}, [loadGuvRechnungen]);

	useEffect(() => {
		loadInvoiceStats();
	}, [loadInvoiceStats, summary.totalEinnahmen, totalExpenses]);

	const resetDialogState = useCallback(() => {
		if (localPreview.imageUrl) {
			URL.revokeObjectURL(localPreview.imageUrl);
		}
		if (localPreview.pdfUrl) {
			URL.revokeObjectURL(localPreview.pdfUrl);
		}

		setFormData(FORM_INITIAL_STATE);
		setSelectedFile(null);
		setLocalPreview({ imageUrl: '', pdfUrl: '' });
		setEditingEntry(null);
		setErrors((prev) => ({ ...prev, form: '', analyze: '' }));
	}, [localPreview.imageUrl, localPreview.pdfUrl]);

	const handleOpenDialog = useCallback(
		(entry = null) => {
			if (entry) {
				setEditingEntry(entry);
				setFormData({
					datum: entry.datum ? new Date(entry.datum).toISOString().slice(0, 10) : FORM_INITIAL_STATE.datum,
					typ: entry.typ || 'einkauf',
					beschreibung: entry.beschreibung || '',
					betrag: String(entry.betrag ?? ''),
					referenznummer: entry.referenznummer || '',
					steuerlaufnummer: entry.steuerlaufnummer || '',
					rechnungsteller: entry.rechnungsteller || '',
					bankdaten: entry.bankdaten || '',
					notizen: entry.notizen || '',
					quelle: entry.quelle || 'einzeln',
					image_url: entry.image_url || null,
					dokument_url: entry.dokument_url || null,
					positionen: Array.isArray(entry.positionen) ? entry.positionen : []
				});
			} else {
				resetDialogState();
			}
			setDialogOpen(true);
		},
		[resetDialogState]
	);

	const handleCloseDialog = useCallback(() => {
		setDialogOpen(false);
		resetDialogState();
	}, [resetDialogState]);

	const handleImageUpload = useCallback(
		(event) => {
			const file = event.target.files?.[0];
			if (!file) {
				return;
			}

			const isImage = file.type.startsWith('image/');
			const isPdf = file.type === 'application/pdf';

			if (!isImage && !isPdf) {
				setErrors((prev) => ({
					...prev,
					analyze: 'Bitte nur Bild- oder PDF-Dateien hochladen.'
				}));
				return;
			}

			if (file.size > 10 * 1024 * 1024) {
				setErrors((prev) => ({
					...prev,
					analyze: 'Datei ist zu groß. Maximal 10 MB sind erlaubt.'
				}));
				return;
			}

			setErrors((prev) => ({ ...prev, analyze: '' }));
			setSelectedFile(file);

			if (localPreview.imageUrl) {
				URL.revokeObjectURL(localPreview.imageUrl);
			}
			if (localPreview.pdfUrl) {
				URL.revokeObjectURL(localPreview.pdfUrl);
			}

			const objectUrl = URL.createObjectURL(file);
			setLocalPreview({
				imageUrl: isImage ? objectUrl : '',
				pdfUrl: isPdf ? objectUrl : ''
			});
		},
		[localPreview.imageUrl, localPreview.pdfUrl]
	);

	const handleAnalyzeImage = useCallback(async () => {
		if (!selectedFile) {
			setErrors((prev) => ({ ...prev, analyze: 'Bitte zuerst eine Datei auswählen.' }));
			return;
		}

		try {
			setLoading((prev) => ({ ...prev, analyze: true }));
			setErrors((prev) => ({ ...prev, analyze: '' }));

			const payload = new FormData();
			payload.append('image', selectedFile);

			const response = await api.post('/guv-rechnung/analyze-image', payload, {
				headers: {
					'Content-Type': 'multipart/form-data'
				}
			});

			const analyzed = response?.data?.data || {};
			const detectedType = TRANSACTION_TYPES.find((item) => item.value === analyzed.typ)
				? analyzed.typ
				: 'einkauf';

			setFormData((prev) => ({
				...prev,
				typ: detectedType,
				beschreibung: analyzed.beschreibung || prev.beschreibung,
				betrag: analyzed.betrag ? String(analyzed.betrag) : prev.betrag,
				referenznummer: analyzed.referenznummer || prev.referenznummer,
				rechnungsteller: analyzed.rechnungsteller || prev.rechnungsteller,
				bankdaten: analyzed.bankdaten || prev.bankdaten,
				quelle: 'bildanalyse',
				image_url: analyzed.image_url || prev.image_url,
				dokument_url: analyzed.dokument_url || prev.dokument_url,
				positionen: Array.isArray(analyzed.positionen) ? analyzed.positionen : prev.positionen
			}));

			toast.success('Beleganalyse erfolgreich übernommen.');
		} catch (error) {
			console.error('Fehler bei der OCR-Analyse:', error);
			setErrors((prev) => ({
				...prev,
				analyze: error?.response?.data?.message || 'Analyse fehlgeschlagen.'
			}));
		} finally {
			setLoading((prev) => ({ ...prev, analyze: false }));
		}
	}, [selectedFile]);

	const handleFormChange = useCallback((field, value) => {
		setFormData((prev) => ({ ...prev, [field]: value }));
	}, []);

	const handlePositionChange = useCallback((index, field, value) => {
		setFormData((prev) => {
			const next = [...(prev.positionen || [])];
			next[index] = { ...next[index], [field]: value };
			return { ...prev, positionen: next };
		});
	}, []);

	const handleAddPosition = useCallback(() => {
		setFormData((prev) => ({
			...prev,
			positionen: [...(prev.positionen || []), { beschreibung: '', betrag: '' }]
		}));
	}, []);

	const handleRemovePosition = useCallback((index) => {
		setFormData((prev) => ({
			...prev,
			positionen: (prev.positionen || []).filter((_, posIndex) => posIndex !== index)
		}));
	}, []);

	const handleSaveDialog = useCallback(async () => {
		const payload = {
			datum: formData.datum,
			typ: formData.typ,
			beschreibung: formData.beschreibung.trim(),
			betrag: toNumber(formData.betrag),
			referenznummer: formData.referenznummer.trim() || null,
			rechnungsteller: formData.rechnungsteller.trim() || null,
			bankdaten: formData.bankdaten.trim() || null,
			notizen: formData.notizen,
			quelle: formData.quelle,
			image_url: formData.image_url || null,
			dokument_url: formData.dokument_url || null,
			positionen: (formData.positionen || [])
				.map((item) => ({
					beschreibung: String(item?.beschreibung || '').trim(),
					betrag: toNumber(item?.betrag)
				}))
				.filter((item) => item.beschreibung && item.betrag >= 0)
		};

		if (!payload.datum || !payload.typ || !payload.beschreibung || payload.betrag <= 0) {
			setErrors((prev) => ({
				...prev,
				form: 'Bitte Datum, Typ, Beschreibung und einen positiven Betrag ausfüllen.'
			}));
			return;
		}

		try {
			setLoading((prev) => ({ ...prev, save: true }));
			setErrors((prev) => ({ ...prev, form: '' }));

			if (editingEntry?._id) {
				await api.put(`/guv-rechnung/${editingEntry._id}`, payload);
				toast.success('GuV-Eintrag wurde aktualisiert.');
			} else {
				await api.post('/guv-rechnung', payload);
				toast.success('GuV-Eintrag wurde erstellt.');
			}

			handleCloseDialog();
			await loadGuvRechnungen();
			await loadInvoiceStats();
		} catch (error) {
			console.error('Fehler beim Speichern:', error);
			setErrors((prev) => ({
				...prev,
				form: error?.response?.data?.message || 'Speichern fehlgeschlagen.'
			}));
		} finally {
			setLoading((prev) => ({ ...prev, save: false }));
		}
	}, [editingEntry?._id, formData, handleCloseDialog, loadGuvRechnungen, loadInvoiceStats]);

	const handleDelete = useCallback(
		async (id) => {
			if (!id) {
				return;
			}

			const confirmed = window.confirm('Soll dieser GuV-Eintrag wirklich gelöscht werden?');
			if (!confirmed) {
				return;
			}

			try {
				setLoading((prev) => ({ ...prev, delete: true }));
				await api.delete(`/guv-rechnung/${id}`);
				toast.success('Eintrag wurde gelöscht.');

				const isLastItemOnPage = guvRechnungen.length === 1 && pagination.page > 0;
				if (isLastItemOnPage) {
					setPagination((prev) => ({ ...prev, page: prev.page - 1 }));
				} else {
					await loadGuvRechnungen();
					await loadInvoiceStats();
				}
			} catch (error) {
				console.error('Fehler beim Löschen:', error);
				toast.error(error?.response?.data?.message || 'Löschen fehlgeschlagen.');
			} finally {
				setLoading((prev) => ({ ...prev, delete: false }));
			}
		},
		[guvRechnungen.length, loadGuvRechnungen, loadInvoiceStats, pagination.page]
	);

	const handleRegenerateSequence = useCallback(async () => {
		const year = Number(filters.geschaeftsjahr);
		const confirmText = Number.isFinite(year)
			? `Laufende Nummern für ${year} neu berechnen?`
			: 'Laufende Nummern neu berechnen?';

		if (!window.confirm(confirmText)) {
			return;
		}

		try {
			setLoading((prev) => ({ ...prev, sequence: true }));
			const response = await api.post('/guv-rechnung/generate-sequence', {
				geschaeftsjahr: Number.isFinite(year) ? year : undefined
			});

			const updated = response?.data?.data?.totalUpdated;
			const successMessage = Number.isFinite(updated)
				? `Laufende Nummern neu berechnet (${updated} Einträge).`
				: response?.data?.message || 'Laufende Nummern wurden neu berechnet.';

			toast.success(successMessage);
			await loadGuvRechnungen();
			await loadInvoiceStats();
		} catch (error) {
			console.error('Fehler bei der Neuberechnung der laufenden Nummern:', error);
			toast.error(error?.response?.data?.message || 'Neuberechnung der laufenden Nummern fehlgeschlagen.');
		} finally {
			setLoading((prev) => ({ ...prev, sequence: false }));
		}
	}, [filters.geschaeftsjahr, loadGuvRechnungen, loadInvoiceStats]);

	const handleOpenReceiptViewer = useCallback((entry) => {
		if (!entry) {
			return;
		}

		if (entry.image_url) {
			setViewer({
				open: true,
				type: 'image',
				url: entry.image_url,
				title: `Beleg ${shortId(entry._id)}`
			});
			return;
		}

		if (entry.dokument_url) {
			setViewer({
				open: true,
				type: 'pdf',
				url: entry.dokument_url,
				title: `Dokument ${shortId(entry._id)}`
			});
			return;
		}

		toast('Für diesen Eintrag ist kein Beleg hinterlegt.');
	}, []);

	const summaryCards = useMemo(
		() => [
			{
				title: 'Einnahmen (bezahlt)',
				amount: toNumber(invoiceStats.paidIncome),
				valueColor: 'success.main',
				subtitle:
					Number.isFinite(invoiceStats.paidReceiptsCount) && Number.isFinite(invoiceStats.totalIncomeCount)
						? `${invoiceStats.paidReceiptsCount} von ${invoiceStats.totalIncomeCount} Rechnungen`
						: 'aus Rechnungsstatistik'
			},
			{
				title: 'Offene Forderungen',
				amount: toNumber(invoiceStats.openReceivables),
				valueColor: 'warning.main',
				subtitle:
					Number.isFinite(invoiceStats.openReceivablesCount)
						? `${invoiceStats.openReceivablesCount} offene Rechnungen`
						: 'aus Rechnungsstatistik'
			},
			{
				title: 'Ausgaben gesamt',
				amount: toNumber(invoiceStats.totalExpenses),
				valueColor: 'text.primary',
				subtitle: 'Einkauf + Material + Arbeit + Sonstiges'
			},
			{
				title: 'Break-Even-Point',
				amount: toNumber(invoiceStats.breakEvenPoint),
				valueColor: null,
				subtitle: 'Einnahmen minus Ausgaben'
			}
		],
		[
			invoiceStats.breakEvenPoint,
			invoiceStats.openReceivables,
			invoiceStats.openReceivablesCount,
			invoiceStats.paidIncome,
			invoiceStats.paidReceiptsCount,
			invoiceStats.totalExpenses,
			invoiceStats.totalIncomeCount
		]
	);

	return (
		<Container maxWidth="xl" sx={{ py: { xs: 2, md: 3 } }}>
			<Stack spacing={2.5}>
				<Box sx={{ textAlign: { xs: 'center', sm: 'left' } }}>
					<Typography
						variant="h4"
						component="h1"
						fontWeight={700}
						sx={{ fontSize: { xs: '1.5rem', sm: '2.125rem' } }}
					>
						GuV-Rechnung
					</Typography>
					<Typography
						variant="body2"
						color="text.secondary"
						sx={{ display: { xs: 'none', sm: 'block' } }}
					>
						Verwaltung, OCR-Analyse und Auswertung aller GuV-Einträge.
					</Typography>
				</Box>

				<Grid
					container
					spacing={1.5}
					alignItems="stretch"
					sx={{ justifyContent: { xs: 'center', sm: 'flex-start' } }}
				>
					<Grid item xs={12} sm={6} lg={3}>
						<Button
							fullWidth
							size="large"
							variant="contained"
							color="primary"
							startIcon={<SearchIcon />}
							onClick={() => fileInputRef.current?.click()}
							sx={{ minHeight: 52, fontWeight: 700 }}
						>
							SCAN
						</Button>
					</Grid>
					<Grid item xs={6} sm={3} lg={2}>
						<Button
							fullWidth
							size="medium"
							variant="outlined"
							startIcon={<AddIcon />}
							onClick={() => handleOpenDialog()}
							sx={{ minHeight: 52 }}
						>
							Neu
						</Button>
					</Grid>
					<Grid item xs={6} sm={3} lg={2}>
						<Button
							fullWidth
							size="medium"
							variant="outlined"
							startIcon={<RefreshIcon />}
							onClick={() => {
								loadGuvRechnungen();
								loadInvoiceStats();
							}}
							sx={{ minHeight: 52 }}
						>
							Aktualisieren
						</Button>
					</Grid>
					<Grid item xs={12} sm={6} lg={3}>
						<Button
							fullWidth
							size="medium"
							variant="outlined"
							color="secondary"
							startIcon={<RefreshIcon />}
							onClick={handleRegenerateSequence}
							disabled={loading.sequence}
							sx={{ minHeight: 52 }}
						>
							{loading.sequence ? 'Berechne...' : 'Lfd. Nr. neu berechnen'}
						</Button>
					</Grid>
					<Grid item xs={12} sm={6} md={3} lg={2}>
						<TextField
							fullWidth
							size="small"
							label="Geschäftsjahr"
							type="number"
							value={filters.geschaeftsjahr}
							onChange={(event) => {
								setPagination((prev) => ({ ...prev, page: 0 }));
								setFilters((prev) => ({ ...prev, geschaeftsjahr: Number(event.target.value || 0) }));
							}}
							inputProps={{ min: 2000, max: 2100 }}
						/>
					</Grid>
					<Grid item xs={12} sm={6} md={3} lg={3}>
						<TextField
							select
							fullWidth
							size="small"
							label="Typ-Filter"
							value={filters.typ}
							onChange={(event) => {
								setPagination((prev) => ({ ...prev, page: 0 }));
								setFilters((prev) => ({ ...prev, typ: event.target.value }));
							}}
						>
							<MenuItem value="">Alle Typen</MenuItem>
							{TRANSACTION_TYPES.map((type) => (
								<MenuItem key={type.value} value={type.value}>
									{type.label}
								</MenuItem>
							))}
						</TextField>
					</Grid>
				</Grid>

				<input
					ref={fileInputRef}
					type="file"
					accept="image/*,application/pdf"
					style={{ display: 'none' }}
					onChange={(event) => {
						handleImageUpload(event);
						if (!dialogOpen) {
							setDialogOpen(true);
						}
					}}
				/>

				{errors.list && <Alert severity="error">{errors.list}</Alert>}

				<Box
					sx={{
						display: 'grid',
						gridTemplateColumns: {
							xs: 'repeat(2, minmax(0, 1fr))',
							sm: 'repeat(2, minmax(0, 1fr))',
							lg: 'repeat(4, minmax(0, 1fr))'
						},
						gap: { xs: 1.25, sm: 1.5 },
						width: '100%',
						boxSizing: 'border-box',
						px: { xs: 1.5, sm: 0 },
						overflowX: 'clip'
					}}
				>
					{summaryCards.map((card) => (
						<Card key={card.title} variant="outlined" sx={{ height: '100%', width: '100%', minWidth: 0 }}>
							<CardContent
								sx={{
									textAlign: { xs: 'center', sm: 'left' },
									py: { xs: 1.5, sm: 2 },
									px: { xs: 1.25, sm: 2 }
								}}
							>
								<Typography variant="body2" color="text.secondary" gutterBottom sx={{ overflowWrap: 'anywhere' }}>
									{card.title}
								</Typography>
								<Typography
									component="div"
									sx={{
										fontWeight: 800,
										fontSize: { xs: '1.15rem', sm: '1.35rem' },
										lineHeight: 1.15,
										mt: 0.25,
										mb: { xs: 0, sm: 0.35 },
										color:
											card.valueColor ||
											(card.title === 'Break-Even-Point'
												? (card.amount < 0 ? 'error.main' : 'success.main')
												: 'text.primary')
									}}
								>
									{formatCurrency(card.amount)}
								</Typography>
								<Typography variant="caption" color="text.secondary" sx={{ display: { xs: 'none', sm: 'inline' } }}>
									{card.subtitle}
								</Typography>
							</CardContent>
						</Card>
					))}
				</Box>

				<Paper variant="outlined" sx={{ overflow: 'hidden' }}>
					<TableContainer sx={{ maxHeight: 620 }}>
						<Table stickyHeader size="small">
							<TableHead>
								<TableRow>
									<TableCell
										sx={{
											position: 'sticky',
											left: 0,
											zIndex: 4,
											backgroundColor: 'background.paper',
											minWidth: 170
										}}
									>
										Beleg
									</TableCell>
									<TableCell sx={{ minWidth: 110 }}>Datum</TableCell>
									<TableCell sx={{ minWidth: 130, display: { xs: 'none', sm: 'table-cell' } }}>
										Typ
									</TableCell>
									<TableCell sx={{ minWidth: 280, display: { xs: 'none', sm: 'table-cell' } }}>
										Beschreibung
									</TableCell>
									<TableCell align="right" sx={{ minWidth: 120 }}>
										Betrag
									</TableCell>
									<TableCell sx={{ minWidth: 140, display: { xs: 'none', sm: 'table-cell' } }}>
										Ref.
									</TableCell>
									<TableCell sx={{ minWidth: 140, display: { xs: 'none', sm: 'table-cell' } }}>
										Lfd. Nr.
									</TableCell>
									<TableCell
										align="right"
										sx={{
											position: 'sticky',
											right: 0,
											zIndex: 4,
											backgroundColor: 'background.paper',
											minWidth: 150
										}}
									>
										Aktionen
									</TableCell>
								</TableRow>
							</TableHead>
							<TableBody>
								{loading.list ? (
									<TableRow>
										<TableCell colSpan={8}>
											<Stack direction="row" spacing={1.5} alignItems="center" py={2} justifyContent="center">
												<CircularProgress size={22} />
												<Typography variant="body2">Einträge werden geladen...</Typography>
											</Stack>
										</TableCell>
									</TableRow>
								) : null}

								{!loading.list && guvRechnungen.length === 0 ? (
									<TableRow>
										<TableCell colSpan={8}>
											<Typography variant="body2" color="text.secondary" py={2} textAlign="center">
												Keine GuV-Einträge gefunden.
											</Typography>
										</TableCell>
									</TableRow>
								) : null}

								{!loading.list
									? guvRechnungen.map((entry) => (
											<TableRow key={entry._id} hover>
												<TableCell
													sx={{
														position: 'sticky',
														left: 0,
														zIndex: 2,
														backgroundColor: 'background.paper'
													}}
												>
													<Stack spacing={0.4}>
														<Typography variant="body2" fontWeight={700}>
															{shortId(entry._id)}
														</Typography>
														<Typography variant="caption" color="text.secondary" noWrap>
															{entry.rechnungsteller || 'Kein Aussteller'}
														</Typography>
													</Stack>
												</TableCell>
												<TableCell>{formatDate(entry.datum)}</TableCell>
												<TableCell sx={{ display: { xs: 'none', sm: 'table-cell' } }}>
													<Chip
														size="small"
														label={TRANSACTION_TYPES.find((type) => type.value === entry.typ)?.label || entry.typ}
														color={entry.typ === 'einnahme' ? 'success' : 'default'}
													/>
												</TableCell>
												<TableCell sx={{ display: { xs: 'none', sm: 'table-cell' } }}>
													<Typography variant="body2" sx={{ maxWidth: 360 }} noWrap>
														{entry.beschreibung}
													</Typography>
												</TableCell>
												<TableCell align="right" sx={{ fontWeight: 700 }}>
													{formatCurrency(entry.betrag)}
												</TableCell>
												<TableCell sx={{ display: { xs: 'none', sm: 'table-cell' } }}>
													<Typography variant="caption" color="text.secondary">
														{entry.referenznummer || '-'}
													</Typography>
												</TableCell>
												<TableCell sx={{ display: { xs: 'none', sm: 'table-cell' } }}>
													<Typography variant="caption" color="text.secondary">
														{entry.steuerlaufnummer || '-'}
													</Typography>
												</TableCell>
												<TableCell
													align="right"
													sx={{
														position: 'sticky',
														right: 0,
														zIndex: 2,
														backgroundColor: 'background.paper'
													}}
												>
													<Stack direction="row" spacing={0.4} justifyContent="flex-end">
														<Tooltip title="Beleg anzeigen">
															<span>
																<IconButton
																	size="small"
																	onClick={() => handleOpenReceiptViewer(entry)}
																	disabled={!entry.image_url && !entry.dokument_url}
																>
																	<RemoveRedEyeIcon fontSize="small" />
																</IconButton>
															</span>
														</Tooltip>
														<Tooltip title="Bearbeiten">
															<IconButton size="small" onClick={() => handleOpenDialog(entry)}>
																<EditIcon fontSize="small" />
															</IconButton>
														</Tooltip>
														<Tooltip title="Löschen">
															<span>
																<IconButton
																	size="small"
																	color="error"
																	onClick={() => handleDelete(entry._id)}
																	disabled={loading.delete}
																>
																	<DeleteIcon fontSize="small" />
																</IconButton>
															</span>
														</Tooltip>
													</Stack>
												</TableCell>
											</TableRow>
										))
									: null}
							</TableBody>
						</Table>
					</TableContainer>

					<Divider />

					<TablePagination
						component="div"
						count={pagination.total}
						page={pagination.page}
						onPageChange={(_, newPage) => setPagination((prev) => ({ ...prev, page: newPage }))}
						rowsPerPage={pagination.rowsPerPage}
						onRowsPerPageChange={(event) => {
							const nextSize = Number(event.target.value);
							setPagination((prev) => ({
								...prev,
								rowsPerPage: nextSize,
								page: 0
							}));
						}}
						rowsPerPageOptions={[20, 50, 100, 200]}
						labelRowsPerPage="Rechnungen pro Seite"
					/>
				</Paper>
			</Stack>

			<Dialog open={dialogOpen} onClose={handleCloseDialog} maxWidth="lg" fullWidth>
				<DialogTitle>{editingEntry ? 'GuV-Eintrag bearbeiten' : 'GuV-Eintrag hinzufügen'}</DialogTitle>
				<DialogContent dividers>
					<Stack spacing={2}>
						{errors.form && <Alert severity="error">{errors.form}</Alert>}
						{errors.analyze && <Alert severity="warning">{errors.analyze}</Alert>}

						<Grid container spacing={1.5}>
							<Grid item xs={12} md={3}>
								<TextField
									fullWidth
									type="date"
									label="Datum"
									InputLabelProps={{ shrink: true }}
									value={formData.datum}
									onChange={(event) => handleFormChange('datum', event.target.value)}
								/>
							</Grid>
							<Grid item xs={12} md={3}>
								<TextField
									select
									fullWidth
									label="Typ"
									value={formData.typ}
									onChange={(event) => handleFormChange('typ', event.target.value)}
								>
									{TRANSACTION_TYPES.map((type) => (
										<MenuItem key={type.value} value={type.value}>
											{type.label}
										</MenuItem>
									))}
								</TextField>
							</Grid>
							<Grid item xs={12} md={3}>
								<TextField
									fullWidth
									label="Betrag (EUR)"
									value={formData.betrag}
									onChange={(event) => handleFormChange('betrag', event.target.value)}
								/>
							</Grid>
							<Grid item xs={12} md={3}>
								<TextField
									fullWidth
									label="Referenznummer"
									value={formData.referenznummer}
									onChange={(event) => handleFormChange('referenznummer', event.target.value)}
								/>
							</Grid>
							<Grid item xs={12} md={6}>
								<TextField
									fullWidth
									label="Beschreibung"
									value={formData.beschreibung}
									onChange={(event) => handleFormChange('beschreibung', event.target.value)}
								/>
							</Grid>
							<Grid item xs={12} md={3}>
								<TextField
									fullWidth
									label="Rechnungssteller"
									value={formData.rechnungsteller}
									onChange={(event) => handleFormChange('rechnungsteller', event.target.value)}
								/>
							</Grid>
							<Grid item xs={12} md={3}>
								<TextField
									fullWidth
									label="Steuerlaufnummer"
									value={formData.steuerlaufnummer}
									onChange={(event) => handleFormChange('steuerlaufnummer', event.target.value)}
								/>
							</Grid>
							<Grid item xs={12}>
								<TextField
									fullWidth
									label="Bankdaten"
									value={formData.bankdaten}
									onChange={(event) => handleFormChange('bankdaten', event.target.value)}
								/>
							</Grid>
							<Grid item xs={12}>
								<TextField
									fullWidth
									multiline
									minRows={2}
									label="Notizen"
									value={formData.notizen}
									onChange={(event) => handleFormChange('notizen', event.target.value)}
								/>
							</Grid>
						</Grid>

						<Divider />

						<Stack spacing={1}>
							<Typography variant="subtitle1" fontWeight={700}>
								Upload und OCR-Bildanalyse
							</Typography>
							<Stack
								direction={{ xs: 'column', sm: 'row' }}
								spacing={1}
								alignItems={{ xs: 'stretch', sm: 'center' }}
							>
								<Button
									variant="outlined"
									startIcon={<UploadFileIcon />}
									onClick={() => fileInputRef.current?.click()}
								>
									Datei auswählen
								</Button>
								<Button
									variant="contained"
									startIcon={<AutoAwesomeIcon />}
									onClick={handleAnalyzeImage}
									disabled={loading.analyze || !selectedFile}
								>
									{loading.analyze ? 'Analysiere...' : 'Beleg scannen'}
								</Button>
								{selectedFile ? (
									<Typography variant="caption" color="text.secondary">
										{selectedFile.name}
									</Typography>
								) : null}
							</Stack>

							<Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
								{(localPreview.imageUrl || formData.image_url) && (
									<Paper variant="outlined" sx={{ p: 1, minWidth: 180, maxWidth: 260 }}>
										<Stack spacing={0.5}>
											<Stack direction="row" spacing={0.6} alignItems="center">
												<ImageIcon fontSize="small" />
												<Typography variant="caption">Bildvorschau</Typography>
											</Stack>
											<Box
												component="img"
												src={localPreview.imageUrl || formData.image_url}
												alt="Belegvorschau"
												sx={{ width: '100%', borderRadius: 1, objectFit: 'cover' }}
											/>
										</Stack>
									</Paper>
								)}

								{(localPreview.pdfUrl || formData.dokument_url) && (
									<Paper variant="outlined" sx={{ p: 1, minWidth: 180, maxWidth: 260 }}>
										<Stack spacing={0.5}>
											<Stack direction="row" spacing={0.6} alignItems="center">
												<PictureAsPdfIcon fontSize="small" />
												<Typography variant="caption">PDF hinterlegt</Typography>
											</Stack>
											<Button
												variant="text"
												size="small"
												onClick={() =>
													setViewer({
														open: true,
														type: 'pdf',
														url: localPreview.pdfUrl || formData.dokument_url,
														title: 'PDF Vorschau'
													})
												}
											>
												PDF öffnen
											</Button>
										</Stack>
									</Paper>
								)}
							</Stack>
						</Stack>

						<Divider />

						<Stack spacing={1}>
							<Stack direction="row" justifyContent="space-between" alignItems="center">
								<Typography variant="subtitle1" fontWeight={700}>
									Positionen
								</Typography>
								<Button size="small" startIcon={<AddIcon />} onClick={handleAddPosition}>
									Position hinzufügen
								</Button>
							</Stack>

							{(formData.positionen || []).length === 0 ? (
								<Typography variant="caption" color="text.secondary">
									Keine Positionen vorhanden.
								</Typography>
							) : null}

							<Stack spacing={1}>
								{(formData.positionen || []).map((position, index) => (
									<Grid container spacing={1} key={`pos-${index}`} alignItems="center">
										<Grid item xs={12} md={7}>
											<TextField
												fullWidth
												size="small"
												label={`Beschreibung ${index + 1}`}
												value={position?.beschreibung || ''}
												onChange={(event) =>
													handlePositionChange(index, 'beschreibung', event.target.value)
												}
											/>
										</Grid>
										<Grid item xs={8} md={4}>
											<TextField
												fullWidth
												size="small"
												label="Betrag"
												value={position?.betrag || ''}
												onChange={(event) => handlePositionChange(index, 'betrag', event.target.value)}
											/>
										</Grid>
										<Grid item xs={4} md={1}>
											<IconButton
												color="error"
												size="small"
												onClick={() => handleRemovePosition(index)}
											>
												<DeleteIcon fontSize="small" />
											</IconButton>
										</Grid>
									</Grid>
								))}
							</Stack>
						</Stack>
					</Stack>
				</DialogContent>
				<DialogActions>
					<Button onClick={handleCloseDialog}>Abbrechen</Button>
					<Button
						variant="contained"
						startIcon={<SaveIcon />}
						disabled={loading.save}
						onClick={handleSaveDialog}
					>
						{loading.save ? 'Speichern...' : 'Speichern'}
					</Button>
				</DialogActions>
			</Dialog>

			<Dialog
				open={viewer.open}
				onClose={() => setViewer({ open: false, type: '', url: '', title: '' })}
				maxWidth="lg"
				fullWidth
			>
				<DialogTitle>{viewer.title || 'Belegansicht'}</DialogTitle>
				<DialogContent dividers sx={{ minHeight: 480 }}>
					{viewer.type === 'image' ? (
						<Box
							component="img"
							src={viewer.url}
							alt="Beleg"
							sx={{ width: '100%', maxHeight: '75vh', objectFit: 'contain' }}
						/>
					) : null}

					{viewer.type === 'pdf' ? (
						<Box
							component="iframe"
							src={viewer.url}
							title="PDF Beleg"
							sx={{ width: '100%', minHeight: '72vh', border: 'none' }}
						/>
					) : null}
				</DialogContent>
				<DialogActions>
					<Button onClick={() => setViewer({ open: false, type: '', url: '', title: '' })}>
						Schließen
					</Button>
				</DialogActions>
			</Dialog>
		</Container>
	);
};

export default AdminGuV;
