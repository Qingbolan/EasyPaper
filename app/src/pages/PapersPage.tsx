import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePaperStore } from '../store/paper-store';
import { useI18n } from '../lib/i18n';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../components/ui/table';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
import { Label } from '../components/ui/label';
import { Switch } from '../components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '../components/ui/tooltip';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../components/ui/alert-dialog';
import { AlertTriangle, FileText, Search, Download, Database, Link2, FolderOpen, CheckCircle2 } from 'lucide-react';
import { PageHeader } from '../components/page-header';
import { filterPapers } from '../lib/paper-utils';
import { exportPapersToExcel } from '@/algorithms';

export default function PapersPage() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const papers = usePaperStore((state) => state.papers);
  const authors = usePaperStore((state) => state.authors);
  const authorMerges = usePaperStore((state) => state.authorMerges);
  const datasets = usePaperStore((state) => state.getDatasets());
  const currentDatasetId = usePaperStore((state) => state.currentDatasetId);
  const setCurrentDataset = usePaperStore((state) => state.setCurrentDataset);
  const [searchQuery, setSearchQuery] = useState('');
  const [showWarningOnly, setShowWarningOnly] = useState(false);
  const [showLinkedAuthorsOnly, setShowLinkedAuthorsOnly] = useState(false);
  const [showExportSuccess, setShowExportSuccess] = useState(false);
  const [exportedFilePath, setExportedFilePath] = useState<string>('');

  // Helper function to check if an author email is linked
  const isAuthorLinked = (email: string): boolean => {
    return authorMerges.some(m =>
      m.primaryEmail === email || m.mergedEmails.includes(email)
    );
  };

  // Helper function to get linked author info
  const getLinkedAuthorInfo = (email: string) => {
    const merge = authorMerges.find(m =>
      m.primaryEmail === email || m.mergedEmails.includes(email)
    );
    if (!merge) return null;

    // Collect all linked authors
    const allAuthors = [
      { name: merge.primaryName, email: merge.primaryEmail, isPrimary: true },
      ...merge.mergedEmails.map((e, idx) => ({
        name: merge.mergedNames[idx],
        email: e,
        isPrimary: false,
      }))
    ];

    return {
      merge,
      allAuthors,
      count: allAuthors.length,
    };
  };

  // Filter and search papers
  const filteredPapers = useMemo(() => {
    let result = papers;

    // Apply warning filter
    if (showWarningOnly) {
      result = filterPapers(result, { showWarningOnly: true });
    }

    // Apply linked authors filter
    if (showLinkedAuthorsOnly) {
      result = result.filter((paper) =>
        paper.authorEmails.some(email => isAuthorLinked(email))
      );
    }

    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter((paper) => {
        return (
          paper.paperId.toString().includes(query) ||
          paper.title.toLowerCase().includes(query) ||
          paper.authorNames.some((name) => name.toLowerCase().includes(query)) ||
          paper.authorEmails.some((email) => email.toLowerCase().includes(query))
        );
      });
    }

    return result;
  }, [papers, searchQuery, showWarningOnly, showLinkedAuthorsOnly, isAuthorLinked]);

  // Handle export to Excel
  const handleExportExcel = async () => {
    try {
      // Get current dataset label
      let datasetLabel = 'All Datasets';
      if (currentDatasetId && currentDatasetId !== 'all') {
        const currentDataset = datasets.find(d => d.id === currentDatasetId);
        if (currentDataset) {
          datasetLabel = currentDataset.label;
        }
      }

      // Build filter info string
      const filterParts: string[] = [];
      if (showWarningOnly) {
        filterParts.push('Warning Only');
      }
      if (showLinkedAuthorsOnly) {
        filterParts.push('Linked Authors Only');
      }
      if (searchQuery) {
        filterParts.push(`Search: "${searchQuery}"`);
      }
      const filterInfo = filterParts.length > 0 ? filterParts.join(', ') : 'No filters applied';

      // Use the export function from algorithms
      const excelBuffer = await exportPapersToExcel(filteredPapers, authorMerges, datasetLabel, filterInfo);

      // Check if we're in Tauri environment
      const isTauri = '__TAURI__' in window;

      if (isTauri) {
        // Tauri environment - use native save dialog
        const { save } = await import('@tauri-apps/plugin-dialog');
        const { writeFile } = await import('@tauri-apps/plugin-fs');

        const defaultFileName = `papers_export_${new Date().toISOString().split('T')[0]}.xlsx`;
        const filePath = await save({
          defaultPath: defaultFileName,
          filters: [{
            name: 'Excel',
            extensions: ['xlsx']
          }]
        });

        if (!filePath) {
          // User canceled the save dialog
          return;
        }

        // Write file using Tauri API
        await writeFile(filePath, new Uint8Array(excelBuffer));

        // Show success dialog
        setExportedFilePath(filePath);
        setShowExportSuccess(true);
      } else {
        // Browser environment - use blob download
        const blob = new Blob([excelBuffer], {
          type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);

        link.setAttribute('href', url);
        link.setAttribute('download', `papers_export_${new Date().toISOString().split('T')[0]}.xlsx`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        // Show success dialog (without file path for browser)
        setExportedFilePath('');
        setShowExportSuccess(true);
      }
    } catch (error) {
      console.error('Export failed:', error);
      alert('Export failed: ' + (error instanceof Error ? error.message : String(error)));
    }
  };

  // Handle showing file in explorer
  const handleShowInExplorer = async () => {
    try {
      // macOS: use 'open -R' to reveal file in Finder
      const { Command } = await import('@tauri-apps/plugin-shell');
      const command = Command.create('open', ['-R', exportedFilePath]);
      await command.execute();
      setShowExportSuccess(false);
    } catch (error) {
      console.error('Failed to show file in explorer:', error);
    }
  };

  // If no datasets exist at all
  if (datasets.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-6">
        <div className="text-center space-y-4">
          <FileText className="h-16 w-16 mx-auto text-muted-foreground opacity-50" />
          <div>
            <h2 className="text-2xl font-bold mb-2">{t('papers.noPapersLoaded')}</h2>
            <p className="text-muted-foreground max-w-md">
              {t('papers.pleaseImport')}
            </p>
          </div>
          <Button size="lg" onClick={() => navigate('/import')}>
            <Download className="h-5 w-5 mr-2" />
            {t('papers.importData')}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-8 py-6 space-y-6">
      <PageHeader
        title={t('papers.title')}
        description={t('papers.description')}
      >
        {/* Dataset Selector */}
        {datasets.length > 0 && (
          <div className="flex items-center gap-3">
            <Database className="h-5 w-5 text-muted-foreground" />
            <Select value={currentDatasetId} onValueChange={setCurrentDataset}>
              <SelectTrigger className="w-[280px]">
                <SelectValue placeholder={t('papers.selectDataset')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('papers.allDatasets')}</SelectItem>
                {datasets.map((dataset) => (
                  <SelectItem key={dataset.id} value={dataset.id}>
                    {dataset.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </PageHeader>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <FileText className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{t('papers.totalPapers')}</p>
              <p className="text-2xl font-bold">{papers.length}</p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-warning/10 rounded-lg">
              <AlertTriangle className="h-5 w-5 text-warning" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{t('papers.papersWithWarnings')}</p>
              <p className="text-2xl font-bold">
                {papers.filter((p) => p.hasWarning).length}
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-success/10 rounded-lg">
              <FileText className="h-5 w-5 text-success" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{t('papers.papersOK')}</p>
              <p className="text-2xl font-bold">
                {papers.filter((p) => !p.hasWarning).length}
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t('papers.searchPlaceholder')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        <div className="flex items-center gap-4">
          {/* Warning filter */}
          <div className="flex items-center gap-2">
            <Switch
              id="warning-filter"
              checked={showWarningOnly}
              onCheckedChange={setShowWarningOnly}
            />
            <Label htmlFor="warning-filter" className="text-sm cursor-pointer">
              <div className="flex items-center gap-1.5">
                <AlertTriangle className="h-4 w-4 text-warning" />
                {t('papers.warningOnly')}
              </div>
            </Label>
          </div>

          {/* Linked Authors filter */}
          <div className="flex items-center gap-2">
            <Switch
              id="linked-filter"
              checked={showLinkedAuthorsOnly}
              onCheckedChange={setShowLinkedAuthorsOnly}
            />
            <Label htmlFor="linked-filter" className="text-sm cursor-pointer">
              <div className="flex items-center gap-1.5">
                <Link2 className="h-4 w-4 text-purple-500" />
                {t('papers.linkedAuthors')}
              </div>
            </Label>
          </div>

          {/* Export button */}
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportExcel}
            disabled={filteredPapers.length === 0}
          >
            <Download className="h-4 w-4 mr-2" />
            {t('papers.exportExcel')}
          </Button>
        </div>
      </div>

      {/* Papers Table */}
      <Card className="!transition-none hover:!scale-100 hover:!shadow-none">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[100px]">{t('papers.paperId')}</TableHead>
                <TableHead>{t('papers.title.column')}</TableHead>
                <TableHead>{t('papers.authors')}</TableHead>
                <TableHead className="w-[100px]">{t('papers.status')}</TableHead>
                <TableHead className="w-[100px]">{t('papers.actions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredPapers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    {t('papers.noPapersFound')}
                  </TableCell>
                </TableRow>
              ) : (
                filteredPapers.map((paper) => {
                  // Check if paper has any linked authors
                  const hasLinkedAuthor = paper.authorEmails.some(email => isAuthorLinked(email));

                  // Build row className
                  let rowClassName = 'transition-none';
                  if (paper.hasWarning) {
                    rowClassName += ' bg-warning/5';
                  }
                  if (hasLinkedAuthor) {
                    rowClassName += ' border-l-4 border-l-purple-500 bg-purple-50/30 dark:bg-purple-950/10';
                  }

                  return (
                    <TableRow
                      key={paper.paperId}
                      className={rowClassName}
                    >
                      <TableCell className="font-mono text-sm">
                        {paper.paperId}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-start gap-2">
                          {paper.hasWarning && (
                            <AlertTriangle className="h-4 w-4 text-warning mt-0.5 flex-shrink-0" />
                          )}
                          <span className="font-medium">{paper.title}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <TooltipProvider>
                          <div className="flex flex-wrap gap-1.5">
                            {paper.authorNames.map((name, idx) => {
                              const email = paper.authorEmails[idx] || 'N/A';
                              const organization = paper.authorOrganizations[idx] || 'N/A';
                              const isWarning = paper.warningAuthors.some(
                                (wa) => wa.email === email
                              );
                              const isCorresponding = paper.correspondingAuthorIndices.includes(idx);

                              // Check if author is linked
                              const linked = isAuthorLinked(email);
                              const linkedInfo = linked ? getLinkedAuthorInfo(email) : null;

                              // Get author statistics
                              // If author is linked, use primary email to get stats
                              const statsEmail = linkedInfo ? linkedInfo.merge.primaryEmail : email;
                              const authorStats = authors.get(statsEmail);
                              const totalPapers = authorStats?.paperCount || 0;
                              const paperRank = (authorStats?.paperIds?.indexOf(paper.paperId) ?? -1) + 1;

                              // Determine Badge style
                              let badgeVariant: 'destructive' | 'secondary' | 'default' = 'secondary';
                              let badgeClassName = 'text-xs cursor-pointer';

                              if (isWarning) {
                                badgeVariant = 'destructive';
                              } else if (isCorresponding) {
                                badgeVariant = 'default';
                                badgeClassName = 'text-xs bg-blue-500 hover:bg-blue-600 text-white cursor-pointer';
                              } else if (linked) {
                                // Linked but no violation and not corresponding author: use purple background
                                badgeVariant = 'default';
                                badgeClassName = 'text-xs bg-purple-500 hover:bg-purple-600 text-white cursor-pointer';
                              }

                              return (
                                <Tooltip key={idx}>
                                  <TooltipTrigger asChild>
                                    <Badge
                                      variant={badgeVariant}
                                      className={badgeClassName}
                                    >
                                      {name}
                                      {linked && (
                                        <Link2 className="h-3 w-3 ml-1 inline" />
                                      )}
                                      {isWarning && (
                                        <AlertTriangle className="h-3 w-3 ml-1 inline" />
                                      )}
                                    </Badge>
                                  </TooltipTrigger>
                                  <TooltipContent className="max-w-xs">
                                    <div className="space-y-1.5 text-sm">
                                      <p className="font-semibold">{name}</p>
                                      <p className="text-xs text-muted-foreground">{email}</p>
                                      {organization && organization !== 'N/A' && (
                                        <p className="text-xs">{organization}</p>
                                      )}

                                      {linked && linkedInfo && (
                                        <div className="pt-1 border-t border-border/50">
                                          <p className="text-xs font-medium text-purple-500 flex items-center gap-1">
                                            <Link2 className="h-3 w-3" />
                                            Linked with {linkedInfo.count - 1} other author{linkedInfo.count > 2 ? 's' : ''}
                                          </p>
                                          <div className="ml-4 mt-1 space-y-0.5">
                                            {linkedInfo.allAuthors.map((author) => (
                                              <p key={author.email} className="text-xs text-muted-foreground">
                                                • {author.name} {author.isPrimary && '(Primary)'}
                                              </p>
                                            ))}
                                          </div>
                                        </div>
                                      )}

                                      <div className="pt-1 border-t border-border/50">
                                        <p className="text-xs">
                                          {t('papers.totalSubmissions')}: <span className="font-medium">{totalPapers}</span>
                                        </p>
                                        <p className="text-xs">
                                          {t('papers.thisPaper').replace('{rank}', String(paperRank))}
                                        </p>
                                      </div>
                                      {isCorresponding && (
                                        <p className="text-xs text-blue-400 font-medium pt-1">{t('papers.correspondingAuthor')}</p>
                                      )}
                                    </div>
                                  </TooltipContent>
                                </Tooltip>
                              );
                            })}
                          </div>
                        </TooltipProvider>
                        {paper.hasWarning && (
                          <p className="text-xs text-warning mt-1.5">
                            ⚠ {paper.warningAuthors.length} {t('papers.authorsExceeded')}
                          </p>
                        )}
                      </TableCell>
                      <TableCell>
                        {paper.hasWarning ? (
                          <Badge variant="destructive" className="text-xs">
                            {t('papers.warning')}
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-xs">
                            {t('papers.ok')}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => navigate(`/papers/${paper.paperId}`)}
                        >
                          {t('papers.view')}
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

      {/* Footer info */}
      <div className="text-sm text-muted-foreground text-center">
        {t('papers.showingCount')
          .replace('{count}', String(filteredPapers.length))
          .replace('{total}', String(papers.length))}
        {searchQuery && ` (${t('papers.filteredBy').replace('{query}', searchQuery)})`}
      </div>

      {/* Export success dialog */}
      <AlertDialog open={showExportSuccess} onOpenChange={setShowExportSuccess}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <div className="flex items-center gap-3">
              <CheckCircle2 className="h-6 w-6 text-green-600" />
              <AlertDialogTitle>{t('papers.exportSuccess')}</AlertDialogTitle>
            </div>
            <AlertDialogDescription className="pt-2">
              {exportedFilePath ? (
                <>
                  {t('papers.exportedTo')}
                  <div className="mt-2 p-2 bg-muted rounded text-sm font-mono break-all">
                    {exportedFilePath}
                  </div>
                </>
              ) : (
                t('papers.downloadedTo')
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('papers.close')}</AlertDialogCancel>
            {exportedFilePath && (
              <AlertDialogAction onClick={handleShowInExplorer}>
                <FolderOpen className="h-4 w-4 mr-2" />
                {t('papers.showInFinder')}
              </AlertDialogAction>
            )}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
