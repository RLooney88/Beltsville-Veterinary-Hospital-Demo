"""Serve SPA deep links without masking missing API endpoints or assets."""
from pathlib import PurePosixPath

from starlette.exceptions import HTTPException
from starlette.staticfiles import StaticFiles


class SPAStaticFiles(StaticFiles):
    async def get_response(self, path, scope):
        try:
            response = await super().get_response(path, scope)
        except HTTPException as exc:
            if exc.status_code != 404:
                raise
        else:
            if response.status_code != 404:
                return response

        # Only actual React route namespaces can fall back to the application.
        # File-like paths and all other namespaces retain their original 404.
        route = PurePosixPath(path)
        page_roots = {
            "services", "appointment", "about", "dogs", "cats", "critters",
            "admin", "portal", "404",
        }
        if route.parts and route.parts[0] in page_roots and not route.suffix:
            return await super().get_response("index.html", scope)
        raise HTTPException(status_code=404)
