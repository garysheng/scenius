import { LoadingStars } from '@/components/ui/loading-stars';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function DevPage() {
  return (
    <div className="container py-8 space-y-8">
      <h1 className="text-3xl font-bold">Development Playground</h1>
      
      <Tabs defaultValue="loading">
        <TabsList>
          <TabsTrigger value="loading">Loading States</TabsTrigger>
        </TabsList>
        
        <TabsContent value="loading" className="space-y-8">
          <h2 className="text-2xl font-semibold">Loading Stars</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <Card className="p-8 flex items-center justify-center min-h-[200px]">
              <LoadingStars size="sm" text="Small loading..." />
            </Card>
            
            <Card className="p-8 flex items-center justify-center min-h-[200px]">
              <LoadingStars size="md" text="Medium loading..." />
            </Card>
            
            <Card className="p-8 flex items-center justify-center min-h-[200px]">
              <LoadingStars size="lg" text="Large loading..." />
            </Card>
            
            <Card className="p-8 flex items-center justify-center min-h-[200px] bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/95">
              <LoadingStars size="md" text="With backdrop blur..." />
            </Card>
            
            <Card className="p-8 flex items-center justify-center min-h-[200px] bg-muted">
              <LoadingStars size="md" text="On muted background..." />
            </Card>
            
            <Card className="p-8 flex items-center justify-center min-h-[200px] bg-primary text-primary-foreground">
              <LoadingStars size="md" text="On primary background..." />
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
} 