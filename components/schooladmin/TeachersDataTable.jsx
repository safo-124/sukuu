// File: components/schooladmin/TeachersDataTable.jsx
"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  MoreHorizontal, Edit3, Trash2, Eye, UserCheck as TeacherIcon, PlusCircle, UserX, UserCog, Loader2, ShieldAlert, // UserCog for general staff, UserCheck for active teacher
  UserCheck
} from "lucide-react";

import { Input } from "@/components/ui/input"; // For Search
import { Search } from "lucide-react"; // Search Icon
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableCaption
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle
} from "@/components/ui/alert-dialog";

const formatDate = (dateString) => {
  if (!dateString) return "N/A";
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return "Invalid Date";
  return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
};

export default function TeachersDataTable({ teachers, schoolId }) {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState("");
  const [itemToModify, setItemToModify] = useState(null); // { id (teacherId), name, action: 'delete' | 'deactivate' | 'activate' }
  const [isProcessing, setIsProcessing] = useState(false);

  const openActionDialog = (teacher, action) => {
    setItemToModify({ 
        id: teacher.id, // This is Teacher record ID
        userId: teacher.user.id, // User ID for activate/deactivate
        name: `${teacher.user.firstName} ${teacher.user.lastName}`, 
        action 
    });
  };

  const handleConfirmAction = async () => {
    if (!itemToModify) return;

    const { id: teacherId, userId, name, action } = itemToModify;
    let apiEndpoint = `/api/schooladmin/${schoolId}/staff/teachers/${teacherId}`; // For DELETE teacher record
    let method = 'DELETE';
    let requestBody = {};
    let loadingMessage = `Processing action for ${name}...`;
    let successMessage = `Action completed for ${name}.`;

    if (action === 'activate' || action === 'deactivate') {
      // This action should target the User's isActive status
      apiEndpoint = `/api/users/${userId}/status`; // NEW API NEEDED: to update user status
      method = 'PUT';
      requestBody = { isActive: action === 'activate' };
      loadingMessage = `${action === 'activate' ? 'Activating' : 'Deactivating'} user account for ${name}...`;
      successMessage = `User account for ${name} ${action === 'activate' ? 'activated' : 'deactivated'}.`;
    } else if (action === 'delete') {
      loadingMessage = `Deleting teacher profile for ${name}...`;
      successMessage = `Teacher profile for ${name} deleted.`;
    } else {
        toast.info(`Action "${action}" not fully implemented.`);
        setItemToModify(null);
        return;
    }

    setIsProcessing(true);
    const toastId = toast.loading(loadingMessage);

    try {
      const response = await fetch(apiEndpoint, {
        method: method,
        headers: { 'Content-Type': 'application/json' },
        body: method !== 'DELETE' ? JSON.stringify(requestBody) : undefined,
      });
      const result = await response.json();

      if (!response.ok) {
        toast.error(result.error || "Action failed.", { id: toastId });
      } else {
        toast.success(result.message || successMessage, { id: toastId });
        router.refresh();
      }
    } catch (error) {
      console.error(`Error during teacher ${action}:`, error);
      toast.error("An unexpected error occurred.", { id: toastId });
    } finally {
      setIsProcessing(false);
      setItemToModify(null);
    }
  };
  
  const filteredTeachers = React.useMemo(() => {
    if (!searchTerm) return teachers;
    const lowerSearch = searchTerm.toLowerCase();
    return teachers.filter(teacher => 
        teacher.user.firstName?.toLowerCase().includes(lowerSearch) ||
        teacher.user.lastName?.toLowerCase().includes(lowerSearch) ||
        teacher.user.email?.toLowerCase().includes(lowerSearch) ||
        teacher.teacherIdNumber?.toLowerCase().includes(lowerSearch) ||
        teacher.specialization?.toLowerCase().includes(lowerSearch)
    );
  }, [teachers, searchTerm]);


  if (!teachers || teachers.length === 0) {
    return (
      <div className="text-center py-10 border rounded-lg bg-card shadow">
        <UserCheck className="mx-auto h-16 w-16 text-muted-foreground mb-4" />
        <h3 className="mt-2 text-xl font-semibold text-foreground">No Teachers Found</h3>
        <p className="mt-2 text-sm text-muted-foreground">No teachers have been added to this school yet.</p>
        <div className="mt-6">
          <Link href={`/${schoolId}/schooladmin/staff/teachers/new`} passHref>
            <Button size="lg"><PlusCircle className="mr-2 h-5 w-5" />Add First Teacher</Button>
          </Link>
        </div>
      </div>
    );
  }
  
  const getDialogDescription = () => {
    if (!itemToModify) return "";
    const name = itemToModify.name;
    switch(itemToModify.action) {
      case 'delete':
        return `This will permanently delete the teacher profile for ${name}. The user account may remain if used elsewhere. This action cannot be undone for the teacher record.`;
      case 'deactivate':
        return `This will mark the user account for ${name} as inactive. They will not be able to log in.`;
      case 'activate':
        return `This will mark the user account for ${name} as active.`;
      default: return "Are you sure?";
    }
  };

  return (
    <>
      <div className="flex items-center py-4">
        <div className="relative w-full md:w-1/2 lg:w-1/3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input type="search" placeholder="Search teachers (Name, Email, ID, Specialization...)" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10" />
        </div>
      </div>

      {filteredTeachers.length === 0 && searchTerm ? (
         <div className="text-center py-10 border rounded-lg bg-card shadow">
            <Search className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="mt-2 text-xl font-semibold text-foreground">No Teachers Match Your Search</h3>
            <p className="mt-2 text-sm text-muted-foreground">Try different keywords or clear the search.</p>
            <Button variant="outline" onClick={() => setSearchTerm("")} className="mt-4">Clear Search</Button>
          </div>
      ) : (
        <div className="border rounded-lg shadow-sm overflow-x-auto">
          <Table>
            <TableCaption className="sr-only">A list of teachers.</TableCaption>
            <TableHeader className="bg-muted/50 dark:bg-muted/30">
              <TableRow>
                <TableHead className="w-[50px] px-2 py-3">Avatar</TableHead>
                <TableHead className="min-w-[180px] py-3 px-4">Name</TableHead>
                <TableHead className="min-w-[150px] py-3 px-4">Teacher ID</TableHead>
                <TableHead className="hidden md:table-cell min-w-[200px] py-3 px-4">Email</TableHead>
                <TableHead className="hidden lg:table-cell min-w-[180px] py-3 px-4">Specialization</TableHead>
                <TableHead className="hidden sm:table-cell min-w-[120px] py-3 px-4">User Status</TableHead>
                <TableHead className="text-right min-w-[100px] py-3 px-4">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredTeachers.map((teacher) => (
                <TableRow key={teacher.id} className="hover:bg-muted/20 dark:hover:bg-muted/10">
                  <TableCell className="px-2 py-2">
                    <Avatar className="h-9 w-9">
                      <AvatarImage src={teacher.user.profilePicture || undefined} alt={`${teacher.user.firstName} ${teacher.user.lastName}`} />
                      <AvatarFallback>{teacher.user.firstName?.[0]}{teacher.user.lastName?.[0]}</AvatarFallback>
                    </Avatar>
                  </TableCell>
                  <TableCell className="font-medium py-3 px-4">{teacher.user.lastName}, {teacher.user.firstName}</TableCell>
                  <TableCell className="text-muted-foreground py-3 px-4">{teacher.teacherIdNumber || "N/A"}</TableCell>
                  <TableCell className="hidden md:table-cell text-muted-foreground py-3 px-4">{teacher.user.email}</TableCell>
                  <TableCell className="hidden lg:table-cell text-muted-foreground py-3 px-4">{teacher.specialization || "N/A"}</TableCell>
                  <TableCell className="hidden sm:table-cell py-3 px-4">
                    <Badge variant={teacher.user.isActive ? "default" : "outline"}
                           className={teacher.user.isActive 
                              ? "border-green-600/50 bg-green-500/10 text-green-700 dark:text-green-400 dark:border-green-500/40 dark:bg-green-500/10" 
                              : "border-slate-600/50 bg-slate-500/10 text-slate-700 dark:text-slate-400 dark:border-slate-500/40 dark:bg-slate-500/10"}>
                      {teacher.user.isActive ? "Active User" : "Inactive User"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right py-3 px-4">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button aria-haspopup="true" size="icon" variant="ghost" className="h-8 w-8"><MoreHorizontal className="h-4 w-4" /><span className="sr-only">Actions</span></Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-56">
                        <DropdownMenuLabel>Teacher Actions</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem asChild><Link href={`/${schoolId}/schooladmin/staff/teachers/${teacher.id}/view`} className="flex items-center w-full cursor-pointer"><Eye className="mr-2 h-4 w-4" /> View Profile</Link></DropdownMenuItem>
                        <DropdownMenuItem asChild><Link href={`/${schoolId}/schooladmin/staff/teachers/${teacher.id}/edit`} className="flex items-center w-full cursor-pointer"><Edit3 className="mr-2 h-4 w-4" /> Edit Details</Link></DropdownMenuItem>
                        <DropdownMenuSeparator />
                        {teacher.user.isActive ? (
                          <DropdownMenuItem onClick={() => openActionDialog(teacher, 'deactivate')} className="cursor-pointer text-orange-600 focus:text-orange-700 focus:bg-orange-500/10 dark:text-orange-500 dark:focus:text-orange-400" disabled={isProcessing && itemToModify?.id === teacher.id}><UserX className="mr-2 h-4 w-4" /> Deactivate User</DropdownMenuItem>
                        ) : (
                          <DropdownMenuItem onClick={() => openActionDialog(teacher, 'activate')} className="cursor-pointer text-green-600 focus:text-green-700 focus:bg-green-500/10 dark:text-green-500 dark:focus:text-green-400" disabled={isProcessing && itemToModify?.id === teacher.id}><UserCheck className="mr-2 h-4 w-4" /> Activate User</DropdownMenuItem>
                        )}
                        <DropdownMenuItem onClick={() => openActionDialog(teacher, 'delete')} className="text-destructive focus:text-destructive focus:bg-destructive/10 cursor-pointer" disabled={isProcessing && itemToModify?.id === teacher.id}><Trash2 className="mr-2 h-4 w-4" /> Delete Teacher Profile</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {itemToModify && (
        <AlertDialog open={!!itemToModify} onOpenChange={(open) => { if (!open && !isProcessing) setItemToModify(null); }}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2"><ShieldAlert className={itemToModify.action === 'delete' ? "text-destructive" : itemToModify.action === 'deactivate' ? "text-orange-500" : "text-green-500"}/>Confirm Action</AlertDialogTitle>
              <AlertDialogDescription>{getDialogDescription()}</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setItemToModify(null)} disabled={isProcessing}>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleConfirmAction} disabled={isProcessing} className={itemToModify.action === 'delete' ? "bg-destructive text-destructive-foreground hover:bg-destructive/90" : itemToModify.action === 'deactivate' ? "bg-orange-500 text-white hover:bg-orange-600" : "bg-primary"}>{isProcessing ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : null}Yes, {itemToModify.action}</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </>
  );
}