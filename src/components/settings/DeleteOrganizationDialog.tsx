import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { AlertTriangle } from 'lucide-react';

interface DeleteOrganizationDialogProps {
  organizationName: string;
  disabled?: boolean;
}

export function DeleteOrganizationDialog({ 
  organizationName, 
  disabled 
}: DeleteOrganizationDialogProps) {
  const [confirmText, setConfirmText] = useState('');
  const { toast } = useToast();

  const handleDelete = () => {
    // Organization deletion is prevented by RLS policies
    toast({
      title: 'Cannot delete organization',
      description: 'Please contact support to delete your organization and all associated data.',
      variant: 'destructive',
    });
    setConfirmText('');
  };

  const isConfirmed = confirmText === organizationName;

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="destructive" disabled={disabled}>
          Delete Organization
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            Delete Organization
          </AlertDialogTitle>
          <AlertDialogDescription className="space-y-3">
            <p>
              This action cannot be undone. This will permanently delete your
              organization and all associated data including:
            </p>
            <ul className="list-disc list-inside text-sm space-y-1">
              <li>All contacts and their information</li>
              <li>All deals and pipeline data</li>
              <li>All activities and history</li>
              <li>All team member associations</li>
            </ul>
            <div className="pt-4">
              <Label htmlFor="confirm-delete">
                Type <span className="font-semibold">{organizationName}</span> to confirm
              </Label>
              <Input
                id="confirm-delete"
                className="mt-2"
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                placeholder="Organization name"
              />
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={() => setConfirmText('')}>
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            disabled={!isConfirmed}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            Delete Organization
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
