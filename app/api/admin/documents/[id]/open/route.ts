import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { ForbiddenError, hasPermission } from '@/lib/rbac/require'
import { requireActiveStaff } from '@/lib/auth/session'
import { PERMISSIONS } from '@/lib/rbac/registry'
import { downloadPrivateObject } from '@/lib/storage/upload'
import { parseDocumentKind } from '@/lib/documents/meta'
import { isClientIdentityCategory } from '@/lib/documents/client-required'
import { friendlyErrorMessage } from '@/lib/errors'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function asciiFilename(name: string) {
  return name.replace(/[^\x20-\x7E]+/g, '_').replace(/["\\]/g, '_') || 'document'
}

/** Same-origin document open — avoids popup blockers on async signed URLs. */
export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const profile = await requireActiveStaff()
    const { id } = await context.params
    if (!id) {
      return NextResponse.json({ error: 'Missing document id.' }, { status: 400 })
    }

    const row = await prisma.attachment.findUnique({ where: { id } })
    if (!row) {
      return NextResponse.json({ error: 'Document not found.' }, { status: 404 })
    }

    const meta = parseDocumentKind(row.kind)
    const canDocView =
      profile.isSuperAdmin || (await hasPermission(profile, PERMISSIONS.DOC_VIEW))
    if (!canDocView) {
      // Staff who can view/upload client identity may open ID / licence copies only.
      const canClientIdentity =
        (await hasPermission(profile, PERMISSIONS.CLIENT_VIEW)) ||
        (await hasPermission(profile, PERMISSIONS.CLIENT_UPLOAD))
      const isIdentity =
        row.entityType === 'CLIENT' && isClientIdentityCategory(meta.category)
      if (!canClientIdentity || !isIdentity) {
        throw new ForbiddenError(`Missing permission: ${PERMISSIONS.DOC_VIEW}`)
      }
    }

    const bytes = await downloadPrivateObject(row.bucket, row.path)
    const filename = asciiFilename(meta.originalName)
    const contentType = row.mimeType || 'application/octet-stream'
    const inline =
      contentType === 'application/pdf' ||
      contentType.startsWith('text/') ||
      contentType === 'image/jpeg' ||
      contentType === 'image/png'

    return new NextResponse(new Uint8Array(bytes), {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Length': String(bytes.length),
        'Content-Disposition': `${inline ? 'inline' : 'attachment'}; filename="${filename}"`,
        'Cache-Control': 'private, no-store',
        'X-Content-Type-Options': 'nosniff',
      },
    })
  } catch (error) {
    if (error instanceof ForbiddenError) {
      return NextResponse.json({ error: error.message }, { status: 403 })
    }
    if (
      error instanceof Error &&
      (error.message === 'Unauthorized' || error.message === 'Account is not active')
    ) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    return NextResponse.json(
      { error: friendlyErrorMessage(error) },
      { status: 500 },
    )
  }
}
