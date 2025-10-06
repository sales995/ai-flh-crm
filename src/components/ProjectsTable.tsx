import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

interface ProjectsTableProps {
  projects: any[];
}

export function ProjectsTable({ projects }: ProjectsTableProps) {
  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Location</TableHead>
            <TableHead>Price</TableHead>
            <TableHead>Details</TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {projects.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                No projects found. Create your first project to get started!
              </TableCell>
            </TableRow>
          ) : (
            projects.map((project) => (
              <TableRow key={project.id}>
                <TableCell className="font-medium">{project.name}</TableCell>
                <TableCell className="capitalize">{project.project_type}</TableCell>
                <TableCell>{project.location}</TableCell>
                <TableCell>${project.price.toLocaleString()}</TableCell>
                <TableCell>
                  <div className="text-sm">
                    {project.bedrooms && `${project.bedrooms} bed`}
                    {project.bathrooms && ` • ${project.bathrooms} bath`}
                    {project.size_sqft && ` • ${project.size_sqft} sqft`}
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant={project.is_active ? "default" : "secondary"}>
                    {project.is_active ? "Active" : "Inactive"}
                  </Badge>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
